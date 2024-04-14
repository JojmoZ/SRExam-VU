import React, { useEffect, useState } from "react";
import Navbar from "../Component/Navbar";
import { invoke } from "@tauri-apps/api";
import StudentHomePage from "../Component/StudentHomePage";
import NoStudentHomePage from "../Component/NoStudentHomePage"; 

export default function Homepage() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);

    useEffect(() => {
        invoke("get_current_user").then((test) => {
            if (test !== null) {
                setUser(test);
            }
        });
    }, []);

    useEffect(() => {
        if (user && user.role === "Student") { 
            setRole("Student");
        } else {
            setRole("NoStudent");
        }
    }, [user]);

    return (
        <div>
            {user && (
                <div>
                    <Navbar />
                    <div className="flex justify-center">
                 {role === "Student" ? <StudentHomePage /> : <NoStudentHomePage />}
                </div>
                    </div>
                   
            )}
        </div>
    );
}
