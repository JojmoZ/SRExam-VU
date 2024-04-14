
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
pub struct GetAllEnrollment {
    pub get_all_enrollment: Option<Vec<Option<Enrollment>>>,
}
#[derive(cynic::QueryFragment, Debug,Serialize)]
pub struct Enrollment {
    #[cynic(rename = "class_code")]
    pub class_code: String,
    pub nim: String,
    #[cynic(rename = "subject_code")]
    pub subject_code: String,
}

#[tauri::command]
pub async fn get_all_enrollment<'a>(mysql_pool: State<'a, Pool>) -> Result<bool, ()> {
    let operation = GetAllEnrollment::build(());

    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await
        .unwrap();

    let count = gettablecount("enrollment", mysql_pool.clone());
    println!("{}", count);
    if count == 0 {
        if let Some(enrollments) = response.data.unwrap().get_all_enrollment {
            let enrollments: Vec<Enrollment> = enrollments
                .into_iter()
                .filter_map(|enrollment_option| enrollment_option)
                .collect();
            seed_users_to_database(&mysql_pool, enrollments).await;
        }
        return Ok(true);
    }
    Ok(false)
}
#[tauri::command]
pub fn getenrollments(mysql_pool: State<Pool>) -> Result<Vec<Enrollment>,()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let query = "
        SELECT subject_code, nim,class_code
        FROM enrollment
    ";
    let result: Result<Vec<Row>, mysql::Error> = conn.query(query);

    let enrollments = match result {
        Ok(rows) => {
            rows.into_iter().map(|row| {
                Enrollment {
                    subject_code: row.get("subject_code").unwrap(),
                    nim: row.get("nim").unwrap(),
                    class_code: row.get("class_code").unwrap(),
                }
            }).collect()
        },
        Err(_) => return Err(()),
    };

    Ok(enrollments)
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

pub async fn seed_users_to_database(mysql_pool: &State<'_, Pool>, enrollments: Vec<Enrollment>) {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    for enrollment in enrollments {
        let query = r#"
        INSERT INTO enrollment (subject_code, nim, class_code) VALUES (:subject_code, :nim, :class_code)
    "#; 
        let params = params!{
            "subject_code" => enrollment.subject_code,
            "nim" => enrollment.nim,
            "class_code" => enrollment.class_code
        };
        conn.exec_drop(&query,params).expect("Failed to execute query");
    }
}
