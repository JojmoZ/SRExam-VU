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
#[cynic::schema("TPAdesktop")]
mod schema {}
#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query")]
pub struct GetAllSubject {
    pub get_all_subject: Vec<Subject>,
}

#[derive(cynic::QueryFragment, Debug,Serialize)]
pub struct Subject {
    #[cynic(rename = "subject_code")]
    pub subject_code: String,
    #[cynic(rename = "subject_name")]
    pub subject_name: String,
}
#[tauri::command]
pub async fn get_all_subject<'a>(mysql_pool: State<'a, Pool>) -> Result<bool, ()> {
    let operation = GetAllSubject::build(());
    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
    .run_graphql(operation)
    .await
    .unwrap();
let count = gettablecount("subject", mysql_pool.clone());
println!("{}", count);
if count == 0 {
    seed_users_to_database(&mysql_pool, response.data.unwrap().get_all_subject).await;
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

pub async fn seed_users_to_database(mysql_pool: &State<'_, Pool>, subjects: Vec<Subject>) {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    for subject in subjects {
        let query = r#"
        INSERT INTO subject (subject_code, subject_name) VALUES (:subject_code, :subject_name)
    "#;
        let params = params!{
            "subject_code" => subject.subject_code,
            "subject_name" => subject.subject_name
        };
        conn.exec_drop(&query,params).expect("Failed to execute query");
    }
}

#[tauri::command]
pub fn getsubjects(mysql_pool: State<Pool>) -> Result<Vec<Subject>,()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let query = "
        SELECT subject_code, subject_name
        FROM subject
    ";
    let result: Result<Vec<Row>, mysql::Error> = conn.query(query);

    let subjects = match result {
        Ok(rows) => {
            rows.into_iter().map(|row| {
                Subject {
                    subject_code: row.get("subject_code").unwrap(),
                    subject_name: row.get("subject_name").unwrap(),
                }
            }).collect()
        },
        Err(_) => return Err(()), 
    };

    Ok(subjects)
}