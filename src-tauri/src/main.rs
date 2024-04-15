// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
extern crate uuid;
extern crate base64;
use std::sync::Mutex;
use cynic::http::SurfExt;
use cynic::QueryBuilder;
// use cynic::{http::SurfExt};
use mysql::{params, prelude::Queryable, Pool,Row};
use redis::Client;
use serde::{Deserialize, Serialize};
use tauri::State;
use tauri;
use serde_json::Value;
#[cynic::schema("TPAdesktop")]
mod schema {}
struct MySQLConfig{
    user:String,
    password:String,
    host:String,
    database:String,
}
impl MySQLConfig {
    fn new(user:String, password:String, host:String, database:String) -> Self{
        return Self{
            user,
            password,
            host,
            database
        };
    }
    fn format_url(&self) -> String{
        return format!("mysql://{}:{}@{}/{}",
        self.user,
        self.password,
        self.host,
        self.database);
    }
}
//----------------------------------------------------------------------------------------
mod userop;
mod roomop;
mod enrollmentop;
mod subjectop;
mod transcop;
fn main() {
    // let client = Client::open("redis://127.0.0.1/").expect("Failed to connect to Redis");
    // let mut con = client.get_connection().expect("Failed to get Redis connection");
    let mysql_config = MySQLConfig::new("root".to_string(),"".to_string(),"localhost".to_string(),"tpatpa".to_string());
    let mysql_url = mysql_config.format_url();
    let pool = Pool::new(&*mysql_url).expect("failed to get pool");
    let current_user = userop::Currentuser {
        user: Mutex::new(None)
    };
    
    tauri::Builder::default()
        .manage(pool)
        .manage(current_user)
        .invoke_handler(tauri::generate_handler![
            enrollmentop::get_all_enrollment,
            enrollmentop::getenrollments,
            // userop::get_users_with_role,
            userop::get_current_user,
            userop::logout,
            userop::get_all_users,
            subjectop::get_all_subject,
            subjectop::getsubjects,
            roomop::get_all_rooms,
            userop::get_pass_by_initial,
            userop::get_pass_by_nim,
            userop::get_role_by_nim,
            userop::loginstudent,
            userop::verify_password,
            userop::hash_password,
            userop::loginassistant,
            userop::get_initial_from_nim,
            userop::getpassfromdbnim,
            userop::insert_pass_db,
            userop::getusers,
            roomop::getrooms,
            transcop::submit_transac,
            transcop::validate_room,
            transcop::apply_algo,
            transcop::get_transac_info,
            transcop::getTransaclist,
            userop::getAssistants,
            transcop::assis_algo,
            transcop::sendassistschedule,
            transcop::assisttrans,
            transcop::futureassist,
            transcop::gettransacdata,
            transcop::gettransacdetails,
            transcop::subexamcootransc,
            transcop::filterTransactions,
            transcop::uploadquestion,
            transcop::download_question,
            transcop::timeextendclass, 
            transcop::timeextendperson,
            transcop::uploadanswer,
            transcop::downloadstudentanswer,
            transcop::uploadreport,
            transcop::addverificator,
            transcop::changeseating,
            transcop::validateseat,
            userop::populateshift,
            userop::editrole,
            userop::getShift,
            userop::getSchedule,
            roomop::getRoomSched,
            userop::getStudentSchedule,
            transcop::reportmanage,
            transcop::getreportdetails,
            userop::getnimassis,
            userop::change_password,
            transcop::filterreportmanagement,
            transcop::checkfinal,
            transcop::checkupload,
            transcop::concatnotes,
            transcop::gettransacnote,
            transcop::appendnote,
            userop::getstudents,
            transcop::finalize,
            transcop::question_check

        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}