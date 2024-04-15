use mysql::prelude::FromRow;
use mysql::{Params, Pool, QueryResult};
use rand::{thread_rng, Error};
use serde::Serialize;
use tauri::State;
extern crate base64;
extern crate uuid;
use cynic::http::SurfExt;
use cynic::QueryBuilder;
use cynic::{self, Id};
use std;
use std::{any::Any, sync::Mutex};
use mysql::{params, prelude::Queryable, Row};
use serde::Deserialize;
use serde_json::Value;
use tauri;
#[cynic::schema("TPAdesktop")]
mod schema {}
pub struct Currentuser {
    pub user: Mutex<Option<User>>,
}
#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query")]
pub struct GetAllUser {
    pub get_all_user: Vec<User>,
}
#[derive(cynic::QueryFragment, Debug, Serialize, Clone)]
pub struct User {
    #[cynic(rename = "bn_number")]
    pub bn_number: cynic::Id,
    pub initial: Option<String>,
    pub major: String,
    pub name: String,
    pub nim: String,
    pub role: String,
}
#[derive(cynic::QueryVariables, Debug)]
pub struct GetUserWithRoleVariables<'a> {
    pub role: &'a str,
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query", variables = "GetUserWithRoleVariables")]
pub struct GetUserWithRole {
    #[arguments(role: $role)]
    pub get_user_with_role: Vec<User>,
}
#[derive(cynic::QueryVariables, Debug)]
pub struct GetPassByInitialVariables<'a> {
    pub initial: &'a str,
}
#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query", variables = "GetPassByInitialVariables")]
pub struct GetPassByInitial {
    #[arguments(initial: $initial)]
    pub get_password_by_initial: String,
}
#[derive(cynic::QueryVariables, Debug)]
pub struct GetPassByNIMVariables<'a> {
    pub nim: &'a str,
}
#[derive(cynic::QueryVariables, Debug)]
pub struct GetrolebynimVariables<'a> {
    pub nim1: &'a str,
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query", variables = "GetrolebynimVariables")]
pub struct Getrolebynim {
    #[arguments(nim: $nim1)]
    #[cynic(rename = "getRoleByNIM")]
    pub get_role_by_nim: String,
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query", variables = "GetPassByNIMVariables")]
pub struct GetPassByNIM {
    #[arguments(nim: $nim)]
    #[cynic(rename = "getPasswordByNIM")]
    pub get_password_by_nim: String,
}
#[derive(Debug, serde::Serialize)]
pub struct PasswordVerificationResult {
    pub is_matched: bool,
}
#[derive(Debug, serde::Serialize)]
pub struct PasswordHashResult {
    pub hashed_password: String,
}
use bcrypt::{hash, verify, BcryptError, DEFAULT_COST};

#[tauri::command]
pub async fn hash_password(password: String) -> Result<PasswordHashResult, String> {
    match hash(&password, DEFAULT_COST) {
        Ok(hashed_password) => {
            let result = PasswordHashResult {
                hashed_password: hashed_password,
            };
            Ok(result)
        }
        Err(_) => Err("Error hashing password".to_string()), 
    }
}
#[tauri::command]
pub async fn verify_password(
    password: String,
    hash: String,
) -> Result<PasswordVerificationResult, String> {
    let is_matched = match bcrypt::verify(&password, &hash) {
        Ok(matched) => matched,
        Err(_) => return Err("Error verifying password".to_string()), 
    };
    Ok(PasswordVerificationResult { is_matched })
}
#[tauri::command]
pub fn get_all_users<'a>(mysql_pool: State<'a, Pool>) -> Result<bool, ()> {
    use async_std::task::block_on;
    println!("test");
    let operation = GetAllUser::build(());
    let response = block_on(async {
        surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
            .run_graphql(operation)
            .await
            .unwrap()
    });
    println!("Kabur");
    let count = gettablecount("user", mysql_pool.clone());
    println!("{}", count);
    if count == 0 {
        block_on(seed_users_to_database(
            &mysql_pool,
            response.data.unwrap().get_all_user,
        ));
        Ok(true)
    } else {
        Ok(false)
    }
}

pub fn gettablecount(tablename: &str, mysql_pool: State<Pool>) -> i32 {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = format!("SELECT COUNT(*) FROM {}", tablename);
    let result: Option<Row> = conn
        .exec_first(&query, ())
        .expect("failed to connect to query");
    match result {
        Some(row) => {
            let count: i32 = row.get("COUNT(*)").unwrap();
            count
        }
        None => {
            println!("No rows found in the table.");
            0
        }
    }
}
pub fn getroleapi(initial: String) -> String {
    use async_std::task::block_on;
    let operation = GetAllUser::build(());
    let response = block_on(async {
        surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
            .run_graphql(operation)
            .await
            .unwrap()
    });
    let users: Vec<User> = response.data.expect("No data found").get_all_user;
    let mut user_role = "Student".to_string();
    for user in users {
        if user.initial == Some(initial.clone()) {
            user_role = user.role;
            break;
        }
    }
    user_role
}
pub async fn seed_users_to_database(mysql_pool: &State<'_, Pool>, users: Vec<User>) {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    for user in users {
        let query = r#"
            INSERT INTO user (bn_number, initial, major, name, nim, role)
            VALUES (:bn_number, :initial, :major, :name, :nim, :role)
        "#;
        let params = params! {
            "bn_number" => user.bn_number.into_inner(),
            "initial" => user.initial.unwrap_or_default(),
            "major" => user.major,
            "name" => user.name,
            "nim" => user.nim,
            "role" => user.role,
        };
        println!("Generated query: {}", query); 
        conn.exec_drop(query, params)
            .expect("Failed to execute query");
    }
}
#[tauri::command]
pub fn get_role_by_nim(mysql_pool: State<Pool>, nim: String) -> String {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = r#"
        SELECT role FROM user WHERE nim = :nim;
    "#;
    let params = params! {
        "nim" => nim,
    };
    let result = conn
        .exec_first(query, params)
        .expect("Failed to execute query");
    match result {
        Some((role,)) => role,
        None => "Role not found".to_string(), 
    }
}

#[tauri::command]
pub async fn get_pass_by_initial(initial: String) -> Result<String, ()> {
    let operation = GetPassByInitial::build(GetPassByInitialVariables { initial: &initial });
    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await
        .unwrap();
    Ok(response.data.unwrap().get_password_by_initial)
}
#[tauri::command]
pub async fn get_pass_by_nim(nim: String) -> Result<String, ()> {
    let operation = GetPassByNIM::build(GetPassByNIMVariables { nim: &nim });
    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await
        .unwrap();
    Ok(response.data.unwrap().get_password_by_nim)
}
pub async fn authenticate_user(
    mysql_pool: State<'_, Pool>,
    nim: String,
) -> Result<Option<User>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = r#"
        SELECT * FROM user WHERE nim = :nim;
    "#;
    let params = params! {
        "nim" => nim,
    };
    let result: Option<Row> = conn
        .exec_first(query, params)
        .expect("Failed to execute query");
    match result {
        Some(row) => {
            let user = User {
                bn_number: Id::new(row.get::<String, &str>("bn_number").unwrap()),
                initial: row.get("initial").unwrap(),
                major: row.get("major").unwrap(),
                name: row.get("name").unwrap(),
                nim: row.get("nim").unwrap(),
                role: row.get("role").unwrap(),
            };
            Ok(Some(user)) 
        }
        None => Ok(None), 
    }
}
#[tauri::command]
pub fn getusers(mysql_pool: State<Pool>) -> Result<Vec<User>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let query = "
        SELECT bn_number, initial, major, name, nim, role
        FROM user
    ";
    let result: Result<Vec<Row>, mysql::Error> = conn.query(query);

    let users = match result {
        Ok(rows) => rows
            .into_iter()
            .map(|row| User {
                bn_number: Id::new(row.get::<String, &str>("bn_number").unwrap()),
                initial: row.get("initial").unwrap(),
                major: row.get("major").unwrap(),
                name: row.get("name").unwrap(),
                nim: row.get("nim").unwrap(),
                role: row.get("role").unwrap(),
            })
            .collect(),
        Err(_) => return Err(()), 
    };

    Ok(users)
}


#[tauri::command]
pub fn getstudents(mysql_pool: State<Pool>) -> Result<Vec<User>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let query = "
    SELECT bn_number, initial, major, name, nim, role
    FROM user WHERE role = \"Student\"
";
    let result: Result<Vec<Row>, mysql::Error> = conn.query(query);

    let users = match result {
        Ok(rows) => rows
            .into_iter()
            .map(|row| User {
                bn_number: Id::new(row.get::<String, &str>("bn_number").unwrap()),
                initial: row.get("initial").unwrap(),
                major: row.get("major").unwrap(),
                name: row.get("name").unwrap(),
                nim: row.get("nim").unwrap(),
                role: row.get("role").unwrap(),
            })
            .collect(),
        Err(_) => return Err(()), 
    };

    Ok(users)
}
pub async fn authenticate_user_initial(
    mysql_pool: State<'_, Pool>,
    initial: String,
) -> Result<Option<User>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = r#"
        SELECT * FROM user WHERE initial = :initial;
    "#;
    let params = params! {
        "initial" => initial,
    };
    let result: Option<Row> = conn
        .exec_first(query, params)
        .expect("Failed to execute query");
    match result {
        Some(row) => {
            let user = User {
                bn_number: Id::new(row.get::<String, &str>("bn_number").unwrap()),
                initial: row.get("initial").unwrap(),
                major: row.get("major").unwrap(),
                name: row.get("name").unwrap(),
                nim: row.get("nim").unwrap(),
                role: row.get("role").unwrap(),
            };
            Ok(Some(user))
        }
        None => Ok(None),
    }
}
#[tauri::command]
pub async fn loginstudent(
    mysql_pool: State<'_, Pool>,
    nim: String,
    current_user: State<'_, Currentuser>,
) -> Result<(), ()> {
    let user_option = authenticate_user(mysql_pool.clone(), nim.clone()).await?;
    if let Some(mut user) = user_option {
        user.role = String::from("Student");
        *current_user.user.lock().unwrap() = Some(user.clone());
        update_user_role_in_database(mysql_pool.clone(), user.clone()).await?;
        Ok(())
    } else {
        Err(())
    }
}
#[tauri::command]
pub async fn loginassistant(
    mysql_pool: State<'_, Pool>,
    initial: String,
    current_user: State<'_, Currentuser>,
) -> Result<(), ()> {
    let user_option = authenticate_user_initial(mysql_pool.clone(), initial.clone()).await?;
    let role = getroleapi(initial);
    if let Some(mut user) = user_option {
        user.role = String::from(role);
        *current_user.user.lock().unwrap() = Some(user.clone());
        update_user_role_in_database(mysql_pool.clone(), user.clone()).await?;
        Ok(())
    } else {
        Err(())
    }
}
async fn update_user_role_in_database(mysql_pool: State<'_, Pool>, user: User) -> Result<(), ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = r#"
        UPDATE user SET role = :role WHERE nim = :nim;
    "#;
    let params = params! {
        "role" => user.role,
        "nim" => user.nim,
    };
    conn.exec_drop(query, params).map_err(|_| ())?;

    Ok(())
}

#[tauri::command]
pub fn getnimassis(initial: String, mysql_pool: State<Pool>) -> Result<String, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = format!("SELECT nim FROM user WHERE initial = '{}'", initial);

    let result: Result<Vec<String>, mysql::Error> = conn.query_map(&query, |row: mysql::Row| {
        let nim_option: Option<String> = row.get("nim").unwrap_or_default();
        nim_option.unwrap_or_else(|| "Nim not found".to_string())
    });

    match result {
        Ok(nims) => {
            if let Some(nim) = nims.into_iter().next() {
                Ok(nim)
            } else {
                Err(format!("No nim found for the initial: '{}'", initial))
            }
        },
        Err(err) => {
            eprintln!("Error fetching nim: {:?}", err);
            Err(format!("Failed to fetch nim for the initial: '{}'", initial))
        },
    }
}


#[tauri::command]
pub async fn get_initial_from_nim(
    mysql_pool: State<'_, Pool>,
    nim: String,
) -> Result<Option<String>, ()> {
    let user_option = authenticate_user(mysql_pool.clone(), nim.clone()).await?;
    if let Some(user) = user_option {
        Ok(user.initial)
    } else {
        Ok(None)
    }
}
#[tauri::command]
pub fn get_current_user(current_user: State<Currentuser>) -> Option<User> {
    return current_user.user.lock().unwrap().clone();
}
#[tauri::command]
pub fn logout(current_user: State<Currentuser>) {
    current_user.user.lock().unwrap().take();
}

#[tauri::command]
pub fn insert_pass_db(mysql_pool: State<'_, Pool>, password: String, nim: String) {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let query = r#"
        INSERT INTO userwithpass (password, nim) VALUES (:password, :nim)
    "#;

    let params = params! {
        "password" => password,
        "nim" => nim,
    };

    conn.exec_drop(query, params)
        .expect("Failed to execute query");
}

#[tauri::command]
pub fn getpassfromdbnim(mysql_pool: State<'_, Pool>, nim: String) -> String {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = r#"
    SELECT password FROM userwithpass where nim = :nim
"#;
    let params = params! {
        "nim" => nim
    };
    let result = conn
        .exec_first(query, params)
        .expect("Failed to execute query");
    match result {
        Some((password,)) => password,
        None => "no".to_string(),
    }
}

#[tauri::command]
pub fn getAssistants(mysql_pool: State<'_, Pool>) -> Result<Vec<User>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let query = "
    SELECT bn_number, initial, major, name, nim, role
    FROM user
    WHERE LENGTH(initial) > 0;  
    ";
    let result: Result<Vec<Row>, mysql::Error> = conn.query(query);

    let users = match result {
        Ok(rows) => rows
            .into_iter()
            .map(|row| User {
                bn_number: Id::new(row.get::<String, &str>("bn_number").unwrap()),
                initial: row.get("initial").unwrap(),
                major: row.get("major").unwrap(),
                name: row.get("name").unwrap(),
                nim: row.get("nim").unwrap(),
                role: row.get("role").unwrap(),
            })
            .collect(),
        Err(_) => return Err(()),
    };

    Ok(users)
}

use rand::seq::SliceRandom;

use self::schema::__fields::Enrollment::subject_code;

#[tauri::command]
pub fn populateshift(mysql_pool: State<Pool>, assistants: Vec<User>) -> Result<(), ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let count = gettablecount("asisshift", mysql_pool.clone());
    if(count==0)
    {

 let shifts = vec!["M", "P"]; 

 let mut rng = thread_rng();

 for assistant in assistants {

     let random_shift = shifts.choose(&mut rng).unwrap();
  
     let query = format!("INSERT INTO asisshift (nim, shift) VALUES ('{}', '{}')", assistant.nim, random_shift);
     
    
     conn.query_drop(&query).expect("Failed to execute statement");
 }

 Ok(())
    }
    else
    {
        Err(())
    }
   
}

#[tauri::command]
pub fn editrole(newrole:String, nim:String, mysql_pool: State<Pool>){
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = format!("UPDATE user SET role = '{}' WHERE nim = '{}'", newrole, nim);
    conn.query_drop(&query).expect("Failed to execute statement");
}


#[tauri::command]
pub fn getShift(nim: String, mysql_pool: State<Pool>) -> String {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = r#"
    SELECT shift FROM asisshift where nim = :nim
"#;
    let params = params! {
        "nim" => nim
    };
    let result = conn
        .exec_first(query, params)
        .expect("Failed to execute query");
    match result {                                                                                                                    
        Some((shift,)) => shift,
        None => "".to_string(),
    }
}
#[tauri::command]
pub fn getSchedule(mysql_pool: State<Pool>, nim: String) -> Result<(Vec<TransacHeader>, Vec<TransacHeader>), ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let first_query = format!(
        r#"
        SELECT transacid, subject_code, date, time, room_number
        FROM transacheader
        WHERE date = CURRENT_DATE AND proctor = '{}'
        "#,
         nim
    );

    let first_result = conn.query_map(&first_query, |row: mysql::Row| {
        let transacid: i32 = row.get("transacid").expect("Failed to get transacid");
        let subject_codeee: String = row.get("subject_code").expect("Failed to get subject_code");
        let date: String = row.get("date").expect("Failed to get date");
        let time: String = row.get("time").expect("Failed to get time");
        let room_number: String = row.get("room_number").expect("Failed to get room_number");
        Ok::<TransacHeader, mysql::Error>(TransacHeader {
            transacid,
            subject_codeee, 
            date,
            time,
            room_number,
            typeoftransac: String::from("Proctor"),
        })
    });

    let first_rows = match first_result {
        Ok(rows) => rows,
        Err(err) => return Err(()),
    };
    let first_transac_header: Vec<TransacHeader> = first_rows
        .into_iter()
        .filter_map(Result::ok) 
        .collect();

     let second_query = format!(
        r#"
        SELECT th.transacid, th.subject_code, th.date, th.time, th.room_number
        FROM transacheader th
        INNER JOIN transacdetail td ON th.transacid = td.transacid
        WHERE th.date = CURRENT_DATE AND td.nim = '{}'
        "#,
        nim
    );

    let second_result = conn.query_map(&second_query, |row: mysql::Row| {
        let transacid: i32 = row.get("transacid").expect("Failed to get transacid");
        let subject_codeee: String = row.get("subject_code").expect("Failed to get subject_code");
        let date: String = row.get("date").expect("Failed to get date");
        let time: String = row.get("time").expect("Failed to get time");
        let room_number: String = row.get("room_number").expect("Failed to get room_number");
        Ok::<TransacHeader, mysql::Error>(TransacHeader {
            transacid,
            subject_codeee, 
            date,
            time,
            room_number,
            typeoftransac: String::from("Exam"),
        })
    });

    let second_rows: Vec<Result<TransacHeader, mysql::Error>> = match second_result {
        Ok(rows) => rows,
        Err(err) =>return Err(()),
    };
    
    let second_transac_headers: Vec<TransacHeader> = second_rows
        .into_iter()
        .filter_map(Result::ok)
        .collect();

    Ok((first_transac_header, second_transac_headers))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransacHeader {
    pub transacid: i32,
    pub subject_codeee: String, 
    pub room_number: String,
    pub date: String,
    pub time: String,
    pub typeoftransac:String,
}


#[tauri::command]
pub fn getStudentSchedule(mysql_pool: State<Pool>, nim: String) -> Result<Vec<TransacHeader>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let second_query = format!(
        r#"
        SELECT th.transacid, th.subject_code, th.date, th.time, th.room_number
        FROM transacheader th
        INNER JOIN transacdetail td ON th.transacid = td.transacid
        WHERE th.date = CURRENT_DATE AND td.nim = '{}'
        "#,
        nim
    );

    let second_result = conn.query_map(&second_query, |row: mysql::Row| {
        let transacid: i32 = row.get("transacid").expect("Failed to get transacid");
        let subject_codeee: String = row.get("subject_code").expect("Failed to get subject_code");
        let date: String = row.get("date").expect("Failed to get date");
        let time: String = row.get("time").expect("Failed to get time");
        let room_number: String = row.get("room_number").expect("Failed to get room_number");
        Ok::<TransacHeader, mysql::Error>(TransacHeader {
            transacid,
            subject_codeee, 
            date,
            time,
            room_number,
            typeoftransac: String::from("Exam"),
        })
    });

    let second_rows: Vec<Result<TransacHeader, mysql::Error>> = match second_result {
        Ok(rows) => rows,
        Err(err) =>return Err(()),
    };
    
    let second_transac_headers: Vec<TransacHeader> = second_rows
        .into_iter()
        .filter_map(Result::ok) 
        .collect();

    Ok(second_transac_headers)
}

#[tauri::command]
pub fn change_password(newpass: String, nim: String, mysql_pool: State<Pool>) -> Result<bool, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = r#"
        UPDATE userwithpass SET password = :newpass WHERE nim = :nim;
    "#;
    let params = params! {
        "newpass" => newpass,
        "nim" => nim,
    };

    match conn.exec_drop(query, params) {
        Ok(_) => Ok(true), 
        Err(err) => {
            eprintln!("Error updating password: {:?}", err);
            Err("Failed to update password.".to_string())
        }
    }
}