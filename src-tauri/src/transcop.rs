use mysql::prelude::FromRow;
use mysql::{Params, Pool};
use rand::Error;
use serde::Serialize;
use surf::http::other::Date;
use tauri::State;
extern crate base64;
extern crate uuid;
use cynic::http::SurfExt;
use cynic::QueryBuilder;
use cynic::{self, Id};
use mysql::{params, prelude::Queryable, Row};
use rand::seq::SliceRandom;
use rand::Rng;
use serde::Deserialize;
use std;
use std::collections::{HashMap, HashSet};
use std::{any::Any, sync::Mutex};
use tauri;

use crate::schema::Int;
use crate::userop::User;

#[derive(Debug, Serialize)]
pub struct TransactionInfo {
    pub transacid :i32,
    pub subject_code: String,
    pub subject_name: String,
    pub room: String,
    pub date: String,
    pub time: String,
    pub seat_number: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct AssistTrans {
    pub transacid: i32,
    pub subject_code: String,
    pub subject_name: String,
    pub room: String,
    pub date: String,
    pub time: String,
    pub classes: String,
    pub verif:Option<String>
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransacList {
    pub transacid: i32,
    pub subject_code: String,
    pub room: String,
    pub date: String,
    pub time: String,
}

#[derive(Deserialize, Serialize)]
pub struct ExamData {
    selectedSubject: String,
    selectedClasses: Vec<String>,
    selectedDate: String,
    selectedTime: String,
    selectedRoom: String,
}
#[derive(Deserialize, Serialize)]
pub struct ValidExamData {
    subjects: String,
    classes: Vec<String>,
    date: String,
    time: String,
    room: String,
    nimValidityList: Vec<NimValidity>,
}
#[derive(Debug, Deserialize, Serialize)]
pub struct NimValidity {
    pub nim: String,
    pub name: String,
    pub valid: bool,
    pub reason: Option<String>,
    pub seat_number: Option<u64>,
    pub subject: String,
    pub class: String,
    pub date: String,
    pub time: String,
    pub room: String,
}

#[derive(serde::Deserialize, serde::Serialize, Clone, Debug)]
pub struct Transaction {
    transacid: i32,
    subject_code: String,
    date: String,
    time: String,
    room: String,
}
#[derive(serde::Deserialize, serde::Serialize, Clone, PartialEq, Default, Debug)]
pub struct Assistant {
    initial: String,
    nim: String,
}

#[tauri::command]
pub fn submit_transac(data: ValidExamData, mysql_pool: State<Pool>) -> Result<String, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let transac_header_query = format!(
        "INSERT INTO transacheader (subject_code, date, time, room_number, classes)
         VALUES ('{}', '{}', '{}', '{}', '{}')",
        data.subjects,
        data.date,
        data.time,
        data.room,
        data.classes.join(",")
    );
    conn.query_drop(&transac_header_query)
        .expect("Failed to insert into transaction header");

    let transac_id_query = "SELECT LAST_INSERT_ID()";
    let transac_id: Option<u64> = conn
        .query_first(transac_id_query)
        .expect("Failed to get last insert ID");

    if let Some(transac_id) = transac_id {
        for nimValidity in &data.nimValidityList {
            if nimValidity.valid {
                let transac_detail_query = format!(
                    "INSERT INTO transacdetail (transacid, nim, class_code, seatnumber) VALUES ({}, '{}', '{}', {})",
                    transac_id, nimValidity.nim, nimValidity.class, nimValidity.seat_number.unwrap()
                );
                conn.query_drop(&transac_detail_query)
                    .expect("Failed to insert into transaction detail");
            }
        }
        Ok("Data received successfully".to_string())
    } else {
        Err("Failed to retrieve transaction ID".to_string())
    }
}

#[tauri::command]
pub fn validate_room(room: String, mysql_pool: State<Pool>) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let room_query = format!(
        "SELECT COUNT(*), IFNULL(SUM(verified != 'Done'), 0) FROM transacheader WHERE room_number = '{}'",
        room
    );
    let (count, verified_count): (Option<u64>, Option<u64>) = conn
        .query_first(&room_query)
        .expect("Failed to execute query").expect("REASON");
    println!("Query Result: {:?}, {:?}", count, verified_count);
    
    match (count, verified_count) {
        (Some(0), _) => true, 
        (_, Some(0)) => true, 
        _ => false, 
    }
}

#[tauri::command]
pub fn apply_algo(mysql_pool: State<Pool>, data: ExamData) -> Result<Vec<NimValidity>, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let mut student_ids: Vec<String> = Vec::new();
    for class_code in &data.selectedClasses {
        let nim_query = format!(
            "SELECT nim FROM enrollment WHERE class_code = '{}' AND subject_code = '{}'",
            class_code, data.selectedSubject
        );
        let results: Vec<String> = conn
            .query_map(nim_query, |nim: String| nim)
            .expect("Failed to fetch NIMs");
        student_ids.extend(results);
    }
    student_ids.sort();
    student_ids.dedup();

    let mut nim_validity_list: Vec<NimValidity> = Vec::new();

    let query_capacity = format!(
        "SELECT room_capacity FROM room WHERE room_number = '{}'",
        data.selectedRoom
    );
    let room_capacity: Option<u64> = conn
        .query_first(&query_capacity)
        .map_err(|e| format!("Failed to fetch room capacity: {}", e))?;

    if let Some(capacity) = room_capacity {
        let mut index = 1;
        for nim in &student_ids {
            let query = format!(
                "SELECT name, class_code FROM user JOIN enrollment ON user.nim = enrollment.nim WHERE user.nim = '{}'",
                nim
            );
            let (name, class_code): (Option<String>, Option<String>) = conn
                .query_first(&query)
                .map(|row| {
                    let (name, class_code): (Option<String>, Option<String>) = row.expect("REASON");
                    (name, class_code)
                })
                .unwrap_or((None, None));

            if index > capacity {
                nim_validity_list.push(NimValidity {
                    nim: nim.clone(),
                    name: name.unwrap_or_else(|| "".to_string()),
                    valid: false,
                    reason: Some(format!("Not enough room for this nim {}", nim)),
                    seat_number: None,
                    subject: data.selectedSubject.clone(),
                    class: class_code.unwrap_or_else(|| "".to_string()),
                    date: data.selectedDate.clone(),
                    time: data.selectedTime.clone(),
                    room: data.selectedRoom.clone(),
                });
            } else {
                let query = format!(
                    "SELECT COUNT(*) FROM transacheader th
                    JOIN transacdetail td ON td.transacid = th.transacid
                    WHERE th.subject_code = '{}' AND td.nim = '{}'",
                    data.selectedSubject, nim
                );

                let result_subject: Option<u64> = conn
                    .query_first(&query)
                    .map_err(|e| format!("Failed to execute subject code query: {}", e))?;

                let query_clash = format!(
                    "SELECT COUNT(*) FROM transacheader th
                    JOIN transacdetail td ON td.transacid = th.transacid
                    WHERE th.date = '{}' AND th.time = '{}' AND td.nim = '{}'",
                    data.selectedDate, data.selectedTime, nim
                );

                let result_clash: Option<u64> = conn
                    .query_first(&query_clash)
                    .map_err(|e| format!("Failed to execute clash query: {}", e))?;

                match (result_subject, result_clash) {
                    (Some(count_subject), Some(count_clash)) if count_subject > 0 => {
                        nim_validity_list.push(NimValidity {
                            nim: nim.clone(),
                            name: name.unwrap_or_else(|| "".to_string()),
                            valid: false,
                            reason: Some(format!(
                                "NIM {} already has an exam with the same subject code",
                                nim
                            )),
                            seat_number: None,
                            subject: data.selectedSubject.clone(),
                            class: class_code.unwrap_or_else(|| "".to_string()),
                            date: data.selectedDate.clone(),
                            time: data.selectedTime.clone(),
                            room: data.selectedRoom.clone(),
                        });
                    }
                    (_, Some(count_clash)) if count_clash > 0 => {
                        nim_validity_list.push(NimValidity {
                            nim: nim.clone(),
                            name: name.unwrap_or_else(|| "".to_string()),
                            valid: false,
                            reason: Some(format!(
                                "NIM {} has another exam scheduled at the selected date and time",
                                nim
                            )),
                            seat_number: None,
                            subject: data.selectedSubject.clone(),
                            class: class_code.unwrap_or_else(|| "".to_string()),
                            date: data.selectedDate.clone(),
                            time: data.selectedTime.clone(),
                            room: data.selectedRoom.clone(),
                        });
                    }
                    _ => {
                        nim_validity_list.push(NimValidity {
                            nim: nim.clone(),
                            name: name.unwrap_or_else(|| "".to_string()),
                            valid: true,
                            reason: None,
                            seat_number: Some(index),
                            subject: data.selectedSubject.clone(),
                            class: class_code.unwrap_or_else(|| "".to_string()),
                            date: data.selectedDate.clone(),
                            time: data.selectedTime.clone(),
                            room: data.selectedRoom.clone(),
                        });
                        index += 1;
                    }
                }
            }
        }
    } else {
        return Err("Room capacity not found".to_string());
    }
    Ok(nim_validity_list)
}

#[tauri::command]
pub fn getTransaclist(mysql_pool: State<'_, Pool>) -> Result<Vec<TransacList>, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = format!(
        "SELECT transacid, subject_code, room_number, date, time FROM transacheader WHERE proctor is null"
    );
    match conn.query_map(&query, |(transacid, subject_code, room, date, time)| {
        TransacList {
            transacid,
            subject_code,
            room,
            date,
            time,
        }
    }) {
        Ok(transactions) => Ok(transactions),
        Err(e) => {
            eprintln!("Error fetching transaction details: {:?}", e);
            Err("Failed to fetch transaction details".to_string())
        }
    }
}

#[tauri::command]
pub fn assis_algo(
    transactions: Vec<Transaction>,
    assistants: Vec<Assistant>,
    mysql_pool: State<Pool>,
) -> Vec<(Transaction, Assistant)> {
    let filtered_results = assistexam(transactions.clone(), assistants.clone(), mysql_pool.clone());
    println!("Filtered Results after assistexam: {:?}", &filtered_results);

    let filtered_results2 = assistsame(filtered_results.clone(), mysql_pool.clone());
    println!(
        "Filtered Results after assistsame: {:?}",
        &filtered_results2
    );

    let filtered_results3 = assistschedule(filtered_results2.clone(), mysql_pool.clone());
    println!(
        "Filtered Results after assistschedule: {:?}",
        &filtered_results3
    );

    let filtered_results4 = assistworkload(filtered_results3.clone(), mysql_pool.clone());
    println!(
        "Filtered Results after assistworkload: {:?}",
        &filtered_results4
    );

    filtered_results4
}
fn assistexam(
    transactions: Vec<Transaction>,
    assistants: Vec<Assistant>,
    mysql_pool: State<Pool>,
) -> Vec<(Transaction, Vec<Assistant>)> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let mut transaction_assistant_pairs = Vec::new();

    for transaction in &transactions {
        let mut query = String::from("SELECT td.nim FROM transacdetail as td join transacheader as th WHERE th.subject_code = '");
        query.push_str(&transaction.subject_code);
        query.push_str("'");
        let invalid_nims: Vec<String> = conn
            .query_map(&query, |row: mysql::Row| {
                let value: Option<String> = row.get(0);
                match value {
                    Some(val) => val,
                    None => String::new(),
                }
            })
            .unwrap_or_else(|_| Vec::new());

        let valid_assistants: Vec<Assistant> = assistants
            .iter()
            .filter(|assistant| !invalid_nims.contains(&assistant.nim))
            .cloned()
            .collect();

        transaction_assistant_pairs.push((transaction.clone(), valid_assistants));
    }

    transaction_assistant_pairs
}
fn assistsame(filtered_results: Vec<(Transaction, Vec<Assistant>)>, mysql_pool: State<Pool>) -> Vec<(Transaction, Vec<Assistant>)> {
    println!("Filtered Results in assistsame: {:?}", &filtered_results);
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let mut valid_results = Vec::new();

    for (transaction, assistants) in filtered_results {
        println!("Transaction in assistsame: {:?}", &transaction);
        println!("Assistants in assistsame: {:?}", &assistants);

        let subject_code_prefix = &transaction.subject_code[..4];
        let subject_code_suffix = &transaction.subject_code[4..8];

        let mut valid_assistants = Vec::new();
        for assistant in assistants {
            let query = format!("SELECT COUNT(*) FROM transacheader WHERE proctor = ? AND subject_code LIKE ?");
            let result: Option<Row> = conn
                .exec_first(&query, (assistant.nim.clone(), format!("{}{}%", subject_code_prefix, subject_code_suffix)))
                .expect("Failed to execute query");

            match result {
                Some(row) => {
                    let count: i32 = row.get(0).unwrap();
                    if count == 0 {
                        valid_assistants.push(assistant);
                    }
                }
                None => {
                    println!("No rows found in the table.");
                }
            }
        }

        println!("Valid Assistants in assistsame: {:?}", &valid_assistants);

        valid_results.push((transaction, valid_assistants));
    }

    println!("Valid Results in assistsame: {:?}", &valid_results);
    valid_results
}

fn assistschedule(
    filtered_results: Vec<(Transaction, Vec<Assistant>)>,
    mysql_pool: State<Pool>,
) -> Vec<(Transaction, Vec<Assistant>)> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let mut valid_results = Vec::new();
    for (transaction, assistants) in filtered_results {
        let mut conflicting_assistants = Vec::new();
        for assistant in &assistants {
            let query1 = format!("SELECT COUNT(*) FROM transacheader WHERE proctor = '{}' AND date = '{}' AND time = '{}'",
                assistant.nim, transaction.date, transaction.time);
            let count1: u64 = conn
                .query_map(&query1, |row: mysql::Row| row.get(0))
                .unwrap_or_else(|_| Vec::new())
                .pop()
                .unwrap_or(Some(0))
                .expect("REASON");

            if count1 > 0 {
                conflicting_assistants.push(assistant.clone());
                continue;
            }
            let query2 = format!("SELECT COUNT(*) FROM transacheader AS th JOIN transacdetail AS td ON td.transacid = th.transacid WHERE nim = '{}' AND date = '{}' AND time = '{}'",
                assistant.nim, transaction.date, transaction.time);
            let count2: u64 = conn
                .query_map(&query2, |row: mysql::Row| row.get(0))
                .unwrap_or_else(|_| Vec::new())
                .pop()
                .unwrap_or(Some(0))
                .expect("REASON");

            if count2 > 0 {
                conflicting_assistants.push(assistant.clone());
            }
        }
        let valid_assistants: Vec<Assistant> = assistants
            .into_iter()
            .filter(|assistant| !conflicting_assistants.contains(assistant))
            .collect();

        valid_results.push((transaction, valid_assistants));
    }

    valid_results
}

fn assistworkload(
    filtered_results: Vec<(Transaction, Vec<Assistant>)>,
    mysql_pool: State<Pool>,
) -> Vec<(Transaction, Assistant)> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let mut valid_results = Vec::new();
    let mut assistant_workloads: HashMap<String, u64> = HashMap::new();
    let mut assigned_assistants: HashSet<String> = HashSet::new();

    for (transaction, mut assistants) in filtered_results {
        assistants.shuffle(&mut rand::thread_rng());

        for assistant in &assistants {
            if assigned_assistants.contains(&assistant.initial) {
                continue;
            }
            let query = format!(
                "SELECT COUNT(*) FROM transacheader WHERE proctor = '{}'",
                assistant.nim
            );

            let workload: u64 = conn
                .query_map(&query, |row: mysql::Row| row.get(0))
                .unwrap_or_else(|_| Vec::new())
                .pop()
                .unwrap_or(Some(0))
                .expect("Failed to get workload count");
            assistant_workloads.insert(assistant.initial.clone(), workload);
            assigned_assistants.insert(assistant.initial.clone());
        }
        assistants.sort_by_key(|assistant| {
            assistant_workloads
                .get(&assistant.initial)
                .copied()
                .unwrap_or_default()
        });

        for assistant in &assistants {
            println!(
                "Assistant: {}, Workload: {}",
                assistant.initial,
                assistant_workloads
                    .get(&assistant.initial)
                    .copied()
                    .unwrap_or_default()
            );
        }

        let assigned_assistant = assistants.first().cloned().unwrap_or_default();

        let workload = assistant_workloads
            .entry(assigned_assistant.initial.clone())
            .or_insert(0);
        *workload += 1;
        valid_results.push((transaction, assigned_assistant));
    }
    valid_results
}

#[tauri::command]
pub fn sendassistschedule(
    assignedAssistants: Vec<(Transaction, Assistant)>,
    mysql_pool: State<Pool>,
) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    for (transaction, assistant) in assignedAssistants {
        println!("Assistant's Initial: {}", assistant.initial);
        println!("Transaction's Transacid: {}", transaction.transacid);

        let query = format!(
            "UPDATE transacheader SET proctor = '{}' WHERE transacid = {}",
            assistant.nim, transaction.transacid
        );
        println!("Generated Query: {}", query);

        if let Err(err) = conn.query_drop(&query) {
            eprintln!("Error executing SQL query: {}", err);
            return false;
        }
    }
    return true;
}

#[tauri::command]
pub fn assisttrans(mysql_pool: State<'_, Pool>, user: User) -> Result<Vec<AssistTrans>, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = format!(
        "SELECT th.transacid, subject.subject_name, th.subject_code , th.room_number, th.date, th.time, th.classes, th.verified FROM 
        transacheader AS th JOIN subject 
        ON subject.subject_code = th.subject_code WHERE th.proctor =  '{}'", user.nim
    );
    match conn.query_map(
        &query,
        |(transacid, subject_name, subject_code, room, date, time, classes,verif)| AssistTrans {
            transacid,
            subject_name,
            subject_code,
            room,
            date,
            time,
            classes,
            verif, 
        },
    ) {
        Ok(transactions) => Ok(transactions),
        Err(e) => {
            eprintln!("Error fetching transaction details: {:?}", e);
            Err("Failed to fetch transaction details".to_string())
        }
    }
}

#[tauri::command]
pub fn futureassist(mysql_pool: State<'_, Pool>, user: User) -> Result<Vec<AssistTrans>, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = format!(
        "SELECT th.transacid, subject.subject_name, th.subject_code, th.classes, th.room_number, th.date, th.time, th.verified FROM 
        transacheader AS th JOIN subject 
        ON subject.subject_code = th.subject_code WHERE th.proctor =  '{}' and th.date > CURRENT_DATE", user.nim
    );
    match conn.query_map(
        &query,
        |(transacid, subject_name, subject_code, room, date, time, classes,verif)| AssistTrans {
            transacid,
            subject_name,
            subject_code,
            room,
            date,
            time,
            classes,
            verif,
        },
    ) {
        Ok(transactions) => Ok(transactions),
        Err(e) => {
            eprintln!("Error fetching transaction details: {:?}", e);
            Err("Failed to fetch transaction details".to_string())
        }
    }
}

#[tauri::command]
pub async fn get_transac_info(
    mysql_pool: State<'_, Pool>,
    user: User,
) -> Result<Vec<TransactionInfo>, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let query = format!(
        "SELECT th.transacid, th.subject_code, s.subject_name, th.room_number, th.date, th.time, td.seatnumber
         FROM transacdetail AS td
         INNER JOIN transacheader AS th ON td.transacid = th.transacid  INNER JOIN subject AS s ON s.subject_code = th.subject_code 
         WHERE td.nim = '{}'",
        user.nim
    );

    match conn.query_map(
        query,
        |(transacid, subject_code, subject_name, room, date, time, seat_number): (
            i32,
            String,
            String,
            String,
            String,
            String,
            Option<u64>,
        )| {
            TransactionInfo {
                transacid,
                subject_code,
                subject_name,
                room,
                date,
                time,
                seat_number,
            }
        },
    ) {
        Ok(transactions) => Ok(transactions),
        Err(e) => {
            eprintln!("Error fetching transaction details: {:?}", e);
            Err("Failed to fetch transaction details".to_string())
        }
    }
}

#[tauri::command]
pub fn gettransacdata(transacid: i32, mysql_pool: State<Pool>) -> Result<LiterallyTransaction, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = format!(
        "SELECT th.transacid, th.subject_code, subject.subject_name, th.date, th.time, th.room_number, th.proctor, th.classes
        FROM transacheader AS th JOIN subject  ON th.subject_code = subject.subject_code
        WHERE th.transacid = '{}'",
        transacid
    );
    let result = conn.query_map(&query, |(transacid, subject_code, subject_name, date, time, room_number, proctor, classes)| {
        LiterallyTransaction {
            transacid,
            subject_code,
            subject_name,
            date,
            time,
            room_number,
            proctor,
            classes,
        }
    });

    match result {
        Ok(mut rows) => {
            if let Some(transaction) = rows.pop() {
                Ok(transaction)
            } else {
                eprintln!("Transaction with ID {} not found", transacid);
                Err(format!("Transaction with ID {} not found", transacid))
            }
        }
        Err(e) => {
            eprintln!("Error fetching transaction details: {:?}", e);
            Err("Failed to fetch transaction details".to_string())
        }
    }
}

    #[tauri::command]
    pub fn gettransacdetails(transacid: i32, mysql_pool: State<Pool>) -> Result<Vec<LiterallyTransacDetail>, String> {
        let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    
        let query = format!(
            "SELECT td.nim, td.seatnumber , u.name ,td.submitstat
            FROM transacdetail AS td JOIN user as u ON u.nim=td.nim WHERE transacid = '{}'",
            transacid
        );
        let result: Result<Vec<Row>, mysql::Error> = conn.query(query);
    
        let detdet = match result {
            Ok(rows) => rows
                .into_iter()
                .map(|row| LiterallyTransacDetail {
                    nim: row.get("nim").unwrap(),
                    name: row.get("name").unwrap(),
                    seatnumber: row.get("seatnumber").unwrap(),
                    submitstat: row.get("submitstat").unwrap(),
                })
                .collect(),
            Err(e) => {
                eprintln!("Error fetching transaction details: {:?}", e);
                return Err("Failed to fetch transaction details".to_string());
            }
        };
    
        Ok(detdet)
    }

    #[tauri::command]
    pub fn getreportdetails(transacid: i32, mysql_pool: State<Pool>) -> Result<Vec<ReportManageDetail>, String> {
        let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    
        let query = format!(
            "SELECT td.nim, td.seatnumber , u.name ,td.reportreason, td.filereport
            FROM transacdetail AS td JOIN user as u ON u.nim=td.nim WHERE transacid = '{}' AND reportreason IS NOT NULL",
            transacid
        );
        let result: Result<Vec<Row>, mysql::Error> = conn.query(query);
    
        let detdet = match result {
            Ok(rows) => rows
                .into_iter()
                .map(|row| {
                    let photoa: Vec<u8> = row.get("filereport").unwrap();
                    ReportManageDetail {
                        nim: row.get("nim").unwrap(),
                        name: row.get("name").unwrap(),
                        seatnumber: row.get("seatnumber").unwrap(),
                        reportreason: row.get("reportreason").unwrap(), 
                        photos: base64::encode(&photoa),
                    }
                })
                .collect(),
            Err(e) => {
                eprintln!("Error fetching transaction details: {:?}", e);
                return Err("Failed to fetch transaction details".to_string());
            }
        };
    
        Ok(detdet)
    }
    


#[derive(Debug, Deserialize, Serialize)]
pub struct LiterallyTransaction {
    pub transacid: i32,
    pub subject_code: String,   
    pub subject_name:String,
    pub date: String,
    pub time: String,
    pub room_number : String,
    pub proctor : String,
    pub classes: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct LiterallyTransacDetail{
    pub nim: String,
    pub name:String,
    pub seatnumber:i32,
    pub submitstat:String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ReportManageDetail{
    pub nim: String,
    pub name:String,
    pub seatnumber:i32,
    pub reportreason:String,
    pub photos:String,
}

#[derive(Debug, Serialize)]
pub struct SubExamCooTrans {
    pub transacid: i32,
    pub subject_code: String,
    pub subject_name: String,
    pub room: String,
    pub date: String,
    pub time: String,
    pub classes: String,
    pub proctor:String
}

#[tauri::command]
pub fn subexamcootransc(mysql_pool: State<'_, Pool>) -> Result<Vec<SubExamCooTrans>, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = format!(
        "SELECT th.transacid, subject.subject_name, th.subject_code, th.room_number, th.date, th.time, th.classes, u.initial FROM transacheader AS th JOIN subject ON subject.subject_code = th.subject_code JOIN user AS u ON u.nim = th.proctor"
    );
    match conn.query_map(
        &query,
        |(transacid, subject_name, subject_code, room, date, time, classes,proctor)| SubExamCooTrans {
            transacid,
            subject_name,
            subject_code,
            room,
            date,
            time,
            classes,
            proctor,
        },
    ) {
        Ok(transactions) => Ok(transactions),
        Err(e) => {
            eprintln!("Error fetching transaction details: {:?}", e);
            Err("Failed to fetch transaction details".to_string())
        }
    }
}

#[tauri::command]
pub fn reportmanage(mysql_pool: State<'_, Pool>) -> Result<Vec<SubExamCooTrans>, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = format!(
        "SELECT th.transacid, subject.subject_name, th.subject_code, th.room_number, th.date, th.time, th.classes, u.initial FROM transacheader AS th JOIN subject ON subject.subject_code = th.subject_code JOIN user AS u ON u.nim = th.proctor where th.reporter = 'yes'"
    );
    match conn.query_map(
        &query,
        |(transacid, subject_name, subject_code, room, date, time, classes,proctor)| SubExamCooTrans {
            transacid,
            subject_name,
            subject_code,
            room,
            date,
            time,
            classes,
            proctor,
        },
    ) {
        Ok(transactions) => Ok(transactions),
        Err(e) => {
            eprintln!("Error fetching transaction details: {:?}", e);
            Err("Failed to fetch transaction details".to_string())
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FilterCriteria {
    date: String,
    room_number: String,
    subject_code: String,
    subject_name: String,
    proctor: String,
    status: String, 
}

#[tauri::command]
pub fn filterTransactions(criteria: FilterCriteria, mysql_pool: State<'_, Pool>) -> Result<Vec<SubExamCooTrans>, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let mut query = "SELECT th.transacid, subject.subject_name, th.subject_code, th.room_number, th.date, th.time, th.classes, u.initial FROM transacheader AS th JOIN subject ON subject.subject_code = th.subject_code JOIN user AS u ON u.nim = th.proctor WHERE 1=1".to_string();

    if !criteria.date.is_empty() {
        query.push_str(&format!(" AND th.date = '{}'", criteria.date));
    }
    if !criteria.room_number.is_empty() {
        query.push_str(&format!(" AND th.room_number = '{}'", criteria.room_number));
    }
    if !criteria.subject_code.is_empty() {
        query.push_str(&format!(" AND th.subject_code = '{}'", criteria.subject_code));
    }
    if !criteria.subject_name.is_empty() {
        query.push_str(&format!(" AND subject.subject_name = '{}'", criteria.subject_name));
    }
    if !criteria.proctor.is_empty() {
        query.push_str(&format!(" AND u.initial = '{}'", criteria.proctor));
    }

    match criteria.status.as_str() {
        "ongoing" => {
            let today = chrono::Local::today().to_string();
            query.push_str(&format!(" AND th.date = '{}'", today));
        }
        "finished" => {
            let today = chrono::Local::today().to_string();
            query.push_str(&format!(" AND th.date < '{}'", today));
        }
        "unfinished" => {
            let today = chrono::Local::today().to_string();
            query.push_str(&format!(" AND th.date > '{}'", today));
        }
        _ => (),
    }

    match conn.query_map(
        &query,
        |(transacid, subject_name, subject_code, room, date, time, classes, proctor)| SubExamCooTrans {
            transacid,
            subject_name,
            subject_code,
            room,
            date,
            time,
            classes,
            proctor,
        },
    ) {
        Ok(transactions) => Ok(transactions),
        Err(e) => {
            eprintln!("Error fetching transaction details: {:?}", e);
            Err("Failed to fetch transaction details".to_string())
        }
    }
}


#[tauri::command]
pub fn download_question(transcid: i32, mysql_pool: State<Pool>) -> Option<String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query_result: Option<Vec<u8>> = conn
        .exec_first("SELECT question FROM transacheader WHERE transacid = :transid", params! {
            "transid" => transcid,
        })
        .unwrap_or(None);

    if let Some(data) = query_result {
        let decoded_data = base64::encode(data);
        Some(decoded_data)
    } else {
        None
    }
}

#[tauri::command]
pub fn timeextendclass(minutes: i32, reason: String, transacid: i32, mysql_pool: State<Pool>) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let result = conn.exec_drop(
        "UPDATE transacheader
        SET addtimeclass = :time, addtimereason = :reason 
        WHERE transacid = :transid",
        params! {
            "time" => minutes,
            "reason" => reason,
            "transid" => transacid,
        },
    );
    
    result.is_ok()
}

#[tauri::command]
pub fn timeextendperson(minutes: i32, reason:String,transacid:i32, nim: String, mysql_pool: State<Pool>)->bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let result = conn.exec_drop(
        "UPDATE transacdetail
        SET addtimestudent = :time, timeextendreasonstudent = :reason 
        WHERE transacid = :transid AND nim = :nim",
        params! {
            "time" => minutes,
            "reason" => reason,
            "transid" => transacid,
            "nim" =>nim,
        },
    );
    
    result.is_ok()
}

#[tauri::command]
pub fn uploadquestion(fileContentBase64: String, transcid:i32,mysql_pool: State<Pool>) -> bool {
    let file_data = base64::decode(fileContentBase64).expect("Failed to decode base64 file data");
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let result = conn.exec_drop(
        "UPDATE transacheader
        SET question = :file_content
        WHERE transacid = :transid",
        params! {
            "file_content" => file_data,
            "transid" => transcid,
        },
    );
    result.is_ok()
}

#[tauri::command]
pub fn uploadanswer (fileContentBase64: String, transcid:i32,nim:String, mysql_pool: State<Pool>)->bool{
    let file_data = base64::decode(fileContentBase64).expect("Failed to decode base64 file data");
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let result = conn.exec_drop(
        "UPDATE transacdetail
        SET answer = :file_content
        WHERE transacid = :transid and nim = :nim",
        params! {
            "file_content" => file_data,
            "transid" => transcid,
            "nim" =>nim
        },
    );
    result.is_ok()
}

#[tauri::command]
pub fn checkfinal(transacid: i32, nim: String, mysql_pool: State<Pool>) -> bool {
    use mysql::prelude::*;

    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let query = "SELECT final FROM transacdetail WHERE transacid = :transacid AND nim = :nim";

    let final_result: Option<String> = conn
        .exec_first(
            query,
            params! {
                "transacid" => transacid,
                "nim" => nim,
            }
        )
        .unwrap_or(None);

    if let Some(final_value) = final_result {
        if final_value == "yes" {
            return true; 
        }
    }

    false 
}
#[tauri::command]
pub fn checkupload(transacid: i32, nim: String, mysql_pool: State<Pool>) -> bool {
    use mysql::prelude::*;

    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let query = "SELECT answer FROM transacdetail WHERE transacid = :transacid AND nim = :nim";

    let answer_result: Option<String> = conn
        .exec_first(
            query,
            params! {
                "transacid" => transacid,
                "nim" => nim,
            }
        )
        .unwrap_or(None);

    match answer_result {
        Some(answer) => answer.is_empty(), 
        None => true, 
    }
}
#[tauri::command]
pub fn downloadstudentanswer(transacid:i32,nim:String, mysql_pool: State<Pool>) -> Option<String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query_result: Option<Vec<u8>> = conn
        .exec_first("SELECT answer FROM transacdetail WHERE nim = :nim AND transacid = :transacid", params! {
            "nim" => nim,
            "transacid" => transacid
        })
        .unwrap_or(None);

    if let Some(data) = query_result {
        let decoded_data = base64::encode(data);
        Some(decoded_data)
    } else {
        None
    }
}

#[tauri::command]
pub fn uploadreport(fileContentBase64: String, description: String,transacid: i32, nim:String, mysql_pool: State<Pool>) -> bool {
    let file_data = base64::decode(fileContentBase64).expect("Failed to decode base64 file data");
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let result = conn.exec_drop(
        "UPDATE transacdetail SET filereport = :file_content , reportreason = :description WHERE transacid = :transid AND nim= :nim",
        params! {
            "file_content" => file_data,
            "description" => description,
            "transid" => transacid,
            "nim" => nim,
        },
    );
    let result2 = conn.exec_drop("
    UPDATE transacheader SET reporter = :report where transacid = :transacid",params!{
        "report" => "yes",
        "transacid" => transacid
    },
    );
    result.is_ok() && result2.is_ok()
}

#[tauri::command]
pub fn addverificator(transacid:i32, transacnote:String, mysql_pool: State<Pool>)->bool{
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let result = conn.exec_drop(
        "UPDATE transacheader
        SET notes = :notes, verified = :verif
        WHERE transacid = :transid",
        params! {
            "verif" => "Done",
            "notes" => transacnote,
            "transid" => transacid,
        },
    );
    result.is_ok()
}

#[tauri::command]
pub fn finalize(transacid:i32,nim:String,mysql_pool: State<Pool>)->bool{
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let result = conn.exec_drop(
        "UPDATE transacdetail
        SET final = :final
        WHERE transacid = :transid AND nim = :nim",
        params! {
            "final" => "yes",
            "transid" => transacid,
            "nim" => nim,
        },
    );
    result.is_ok()
}

#[tauri::command]
pub fn changeseating(newseat: i32, reasoning: String, nim: String, transacid: i32, mysql_pool: State<Pool>) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let result = conn.exec_drop(
        "UPDATE transacdetail
        SET seatnumber = :seatnumber, seatchangereason = :reasoning
        WHERE transacid = :transacid and nim = :nim",
        params! {
            "seatnumber" => newseat,
            "reasoning" => reasoning,
            "transacid" => transacid,
            "nim" => nim
        },
    );
    result.is_ok()
}
#[tauri::command]
pub fn validateseat(newseat: i32, transacid: i32, mysql_pool: State<Pool>) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let room_query = format!(
        "SELECT COUNT(*) FROM transacdetail WHERE seatnumber = '{}' and transacid = '{}'",
        newseat, transacid
    );
    let result: Option<u64> = conn
        .query_first(&room_query)
        .expect("Failed to execute query");
    println!("Query Result: {:?}", result);
    match result {
        Some(count) => count == 0,
        None => true, 
    }
}

#[tauri::command]
pub fn filterreportmanagement(criteria: FilterCriteria, mysql_pool: State<'_, Pool>) -> Result<Vec<SubExamCooTrans>, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let mut query = "SELECT th.transacid, subject.subject_name, th.subject_code, th.room_number, th.date, th.time, th.classes, u.initial FROM transacheader AS th JOIN subject ON subject.subject_code = th.subject_code JOIN user AS u ON u.nim = th.proctor WHERE 1=1 AND th.reporter = 'yes'".to_string();

    if !criteria.date.is_empty() {
        query.push_str(&format!(" AND th.date = '{}'", criteria.date));
    }
    if !criteria.room_number.is_empty() {
        query.push_str(&format!(" AND th.room_number = '{}'", criteria.room_number));
    }
    if !criteria.subject_code.is_empty() {
        query.push_str(&format!(" AND th.subject_code = '{}'", criteria.subject_code));
    }
    if !criteria.subject_name.is_empty() {
        query.push_str(&format!(" AND subject.subject_name = '{}'", criteria.subject_name));
    }
    if !criteria.proctor.is_empty() {
        query.push_str(&format!(" AND u.initial = '{}'", criteria.proctor));
    }

    match criteria.status.as_str() {
        "ongoing" => {
            let today = chrono::Local::today().to_string();
            query.push_str(&format!(" AND th.date = '{}'", today));
        }
        "finished" => {
            let today = chrono::Local::today().to_string();
            query.push_str(&format!(" AND th.date < '{}'", today));
        }
        "unfinished" => {
            let today = chrono::Local::today().to_string();
            query.push_str(&format!(" AND th.date > '{}'", today));
        }
        _ => (),
    }

    match conn.query_map(
        &query,
        |(transacid, subject_name, subject_code, room, date, time, classes, proctor)| SubExamCooTrans {
            transacid,
            subject_name,
            subject_code,
            room,
            date,
            time,
            classes,
            proctor,
        },
    ) {
        Ok(transactions) => Ok(transactions),
        Err(e) => {
            eprintln!("Error fetching transaction details: {:?}", e);
            Err("Failed to fetch transaction details".to_string())
        }
    }
}

#[tauri::command]
pub fn concatnotes(newseat:i32,reasoning:String,nim:String,transacid:i32,oldseat:i32,name:String,mysql_pool: State<Pool>)->bool{
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = r#"UPDATE transacheader
    SET notes = CONCAT(notes, ',', :nim - :name, from :oldseat to :newseat because :reasoning)
    WHERE transacid = :transacid"#;

    let result = conn.exec_drop(
    query,
    params! {
    "nim"=>nim,
    "name"  =>name,
    "oldseat" =>oldseat,
    "newseat" =>newseat,
    "reasoning" => reasoning,
    "transacid" => transacid,
    }
    );

    match result {
    Ok(_) => true, 
    Err(_) => false, 
    }
}

#[tauri::command]
pub fn gettransacnote(mysql_pool: State<Pool>, transacid: i32) -> Option<String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = r#"
        SELECT notes FROM transacheader WHERE transacid = :transacid;
    "#;
    let params = params! {
        "transacid" => transacid,
    };

    let result = conn
        .exec_first(query, params)
        .expect("Failed to execute query")
        .map(|row: mysql::Row| {
            let notes: Option<String> = match row.get(0) {
                Some(note) => Some(note), 
                None => None,            
            };
            notes
        });

    match result {
        Some(option) => option,
        None => None,
    }
}

#[tauri::command]
pub fn appendnote(transacid: i32, note: String, mysql_pool: State<Pool>) -> bool {
    use mysql::prelude::*;

    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let query = r#"UPDATE transacheader
                   SET notes = CONCAT(IFNULL(notes, ''), ',', :note)
                   WHERE transacid = :transacid"#;

    let result = conn.exec_drop(
        query,
        params! {
            "note" => note,
            "transacid" => transacid,
        }
    );

    match result {
        Ok(_) => true,  
        Err(_) => false,  
    }
}

#[tauri::command]
pub fn question_check(mysql_pool: State<Pool>, transacid: i32) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = r#"
        SELECT question FROM transacheader WHERE transacid = :transacid;
    "#;
    let params = params! {
        "transacid" => transacid,
    };

    let result = conn
        .exec_first(query, params)
        .expect("Failed to execute query")
        .map(|row: mysql::Row| row.get::<Vec<u8>, _>(0));

    match result {
        Some(question) => question.expect("REASON").len() != 0, 
        None => false, 
    }
}