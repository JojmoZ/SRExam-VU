extern crate uuid;
extern crate base64;
use std::sync::Mutex;
use cynic::http::SurfExt;
use cynic::QueryBuilder;
use mysql::{params, prelude::Queryable, Pool,Row};
use serde::{Deserialize, Serialize};
use tauri::State;
use tauri;
use serde_json::Value;

use crate::userop::TransacHeader;
#[cynic::schema("TPAdesktop")]
mod schema {}
#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query")]
pub struct GetAllRoom {
    pub get_all_room: Vec<Room>,
}

#[derive(cynic::QueryFragment, Debug,Serialize)]
pub struct Room {
    pub campus: String,
    #[cynic(rename = "room_capacity")]
    pub room_capacity: i32,
    #[cynic(rename = "room_number")]
    pub room_number: String,
}

#[tauri::command]
pub async fn get_all_rooms<'a>(mysql_pool: State<'a, Pool>) -> Result<bool, ()> {
    let operation= GetAllRoom::build(());
    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
    .run_graphql(operation)
    .await
    .unwrap();
let count = gettablecount("room", mysql_pool.clone());
println!("{}", count);
if count == 0 {
    seed_rooms_to_database(&mysql_pool, response.data.unwrap().get_all_room).await;
    return Ok(true); 
}
Ok(false) 
}

pub fn gettablecount(tablename: &str, mysql_pool: State<Pool>) -> i32 {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = format!("SELECT COUNT(*) FROM {}", tablename);
    let result: Option<Row> = conn
        .exec_first(
            &query,
            (),
        )
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

pub async fn seed_rooms_to_database(mysql_pool: &State<'_, Pool>, rooms: Vec<Room>) {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    for room in rooms {
        let query = r#"
        INSERT INTO room (room_number, room_capacity, campus) VALUES (:room_number, :room_capacity, :campus)
    "#;
        let params = params!{
           "room_number"=> room.room_number,
           "room_capacity"=> room.room_capacity,
           "campus"=> room.campus 
    };
    conn.exec_drop(query, params).expect("Failed to execute query");
}
}
#[tauri::command]
pub fn getrooms(mysql_pool: State<Pool>) -> Result<Vec<Room>,()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let query = "
        SELECT room_number, room_capacity,campus
        FROM room
    ";
    let result: Result<Vec<Row>, mysql::Error> = conn.query(query);

    let rooms = match result {
        Ok(rows) => {
            rows.into_iter().map(|row| {
                Room {
                    room_number: row.get("room_number").unwrap(),
                    room_capacity: row.get("room_capacity").unwrap(),
                    campus: row.get("campus").unwrap(),
                }
            }).collect()
        },
        Err(_) => return Err(()), 
    };

    Ok(rooms)
}


#[tauri::command]
pub fn getRoomSched(date: String, mysql_pool: State<Pool>) -> Result<Vec<TransacHeader2>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = format!(
        r#"
        SELECT th.transacid, th.subject_code, th.time, th.room_number, r.room_capacity
        FROM transacheader as th
        JOIN room AS r ON th.room_number = r.room_number
        WHERE date = '{}'
        "#,
        date
    );

    println!("Executing query: {}", query);

    let result = conn.query_map(&query, |row: mysql::Row| {
        let transacid: i32 = row.get("transacid").expect("Failed to get transacid");
        let subject_codeee: String = row.get("subject_code").expect("Failed to get subject_code");
        let room_number: String = row.get("room_number").expect("Failed to get room_number");
        let time: String = row.get("time").expect("Failed to get time");
        let room_capacity: i32 = row.get("room_capacity").expect("Failed to get room_capacity");

        Ok::<TransacHeader2, mysql::Error>(TransacHeader2 {
            transacid,
            subject_codeee,
            room_number,
            time,
            typeoftransac: String::from("Exam"),
            room_capacity,
        })
    });

    match result {
        Ok(rows) => {
            let schedules: Vec<TransacHeader2> = rows
                .into_iter()
                .filter_map(Result::ok)
                .collect();
            println!("Fetched room schedules: {:?}", schedules);
            Ok(schedules)
        }
        Err(err) => {
            println!("Error executing query: {}", err);
            Err(())
        }
    }
}


#[derive(Debug, Serialize, Deserialize)]
pub struct TransacHeader2 {
    pub transacid: i32,
    pub subject_codeee: String, 
    pub room_number:String,
    pub time: String,
    pub typeoftransac:String,
    pub room_capacity:i32,
}
