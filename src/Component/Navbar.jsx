import { invoke } from '@tauri-apps/api';
import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useNavigate } from "react-router-dom";

const Navbar = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const [greet, setGreet] = useState("You are not logged in");
    const [showDropdownTransac, setShowDropdownTransac] = useState(false);
    const [showDropdownManage, setShowDropdownManage] = useState(false);
    const [showDropdownSchedule, setShowDropdownSchedule] = useState(false);
    const [isTransacClicked, setIsTransacClicked] = useState(false);
    const [isManageClicked, setIsManageClicked] = useState(false);
    const [isScheduleClicked, setIsScheduleClicked] = useState(false);

    useEffect(() => {
        invoke("get_current_user").then((test) => {
            if (test !== null) {
                setUser(test);
            }
        });
    }, []);

    useEffect(() => {
        if (!user) {
            setGreet("You are not logged in");
        } else if (user.role === "Student") {
            setGreet(<RouterLink to={"/Profilepage"}>{user.nim}-{user.name}</RouterLink>);
        } else {
            setGreet(<RouterLink to={"/Profilepage"}>{user.initial} | {user.name}</RouterLink>);
        }
    }, [user]);

    function logout() {
        invoke("logout").then(() => {
            setUser(null);
        });
        navigate('/');
    }
    function toggleDropdownTransac() {
        if (showDropdownManage || showDropdownSchedule) {
            setShowDropdownManage(false);
            setShowDropdownSchedule(false);
            setIsManageClicked(false);
            setIsScheduleClicked(false);
        }
        setShowDropdownTransac(!showDropdownTransac);
        setIsTransacClicked(!isTransacClicked);
    }
    function toggleDropdownManage() {
        if (showDropdownTransac || showDropdownSchedule) {
            setShowDropdownTransac(false);
            setShowDropdownSchedule(false);
            setIsTransacClicked(false);
            setIsScheduleClicked(false);
        }
        setShowDropdownManage(!showDropdownManage);
        setIsManageClicked(!isManageClicked);
    }
    function toggleDropdownSchedule() {
        if (showDropdownTransac || showDropdownManage) {
            setShowDropdownTransac(false);
            setShowDropdownManage(false);
            setIsTransacClicked(false);
            setIsManageClicked(false);
        }
        setShowDropdownSchedule(!showDropdownSchedule);
        setIsScheduleClicked(!isScheduleClicked);
    }

    return (
        <div className="flex flex-row w-screen justify-between items-center px-12 py-4 shadow">
            <div className='flex flex-row items-center gap-4'>
                <p className='text-3xl font-bold'>
                    <img src="src/assets/SRexam.jpg" alt="Logo" className="h-20 w-20" />
                </p>
                <RouterLink to={"/home"}>
                    <p className='text-3xl ml-2'>
                        Home
                    </p>
                </RouterLink>
                {user && user.role !== "Student" && user.role !== "Assistant" && (
                    <div className="relative">
                        <p className="text-3xl ml-2 cursor-pointer" style={{ color: isTransacClicked ? '#ffffff' : '#646cff' }} onClick={toggleDropdownTransac}>
                            Transactions
                        </p>
                        {showDropdownTransac && (
                            <div className="absolute top-full mt-1 bg-white shadow-lg rounded-md">
                                {(user.role === "Exam Coordinator" || user.role === "Subject Development") && (
                                    <RouterLink to={"/Viewtransac"}>
                                        <p className="text-2xl ml-2 py-2 px-4 hover:bg-gray-100 cursor-pointer">
                                            View Transactions
                                        </p>
                                    </RouterLink>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {user && user.role !== "Student" && user.role !== "Assistant" && (
                    <div className="relative">
                        <p className="text-3xl ml-2 cursor-pointer" style={{ color: isManageClicked ? '#ffffff' : '#646cff' }} onClick={toggleDropdownManage}>
                            Management
                        </p>
                        {showDropdownManage && (
                            <div className="absolute top-full mt-1 bg-white shadow-lg rounded-md">
                                <RouterLink to={"/Reportmanag"}>
                                    <p className="text-2xl ml-2 py-2 px-4 hover:bg-gray-100 cursor-pointer">
                                       Report Management
                                    </p>
                                </RouterLink>
                                <RouterLink to={"/Subjectmanag"}>
                                    <p className="text-2xl ml-2 py-2 px-4 hover:bg-gray-100 cursor-pointer">
                                       Subject Management
                                    </p>
                                </RouterLink>
                                {(user.role === "Exam Coordinator") && (
                                    <RouterLink to={"/Usermanag"}>
                                        <p className="text-2xl ml-2 py-2 px-4 hover:bg-gray-100 cursor-pointer">
                                            User Management
                                        </p>
                                    </RouterLink>
                                )}
                                 {(user.role === "Exam Coordinator") && (
                                    <RouterLink to={"/Roommanag"}>
                                        <p className="text-2xl ml-2 py-2 px-4 hover:bg-gray-100 cursor-pointer">
                                            Room Management
                                        </p>
                                    </RouterLink>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {user && user.role !== "Student" && user.role !=="Subject Development" && user.role !=="Assistant" && (
                    <div className="relative">
                        <p className="text-3xl ml-2 cursor-pointer" style={{ color: isScheduleClicked ? '#ffffff' : '#646cff' }} onClick={toggleDropdownSchedule}>
                            Schedule
                        </p>
                        {showDropdownSchedule && (
                            <div className="absolute top-full mt-1 bg-white shadow-lg rounded-md">
                                <RouterLink to={"/Examscheduler"}>
                                    <p className="text-2xl ml-2 py-2 px-4 hover:bg-gray-100 cursor-pointer">
                                        Exam Scheduler
                                    </p>
                                </RouterLink>
                                {(user.role === "Exam Coordinator" || user.role === "Subject Development") && (
                                    <RouterLink to={"/Viewschedule"}>
                                        <p className="text-2xl ml-2 py-2 px-4 hover:bg-gray-100 cursor-pointer">
                                           View Schedule
                                        </p>
                                    </RouterLink>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {!user && (
                <div className='flex flex-row items-center'>
                    <p className='text-3xl font-bold mr-7'>{greet}</p>
                    <RouterLink to={"/"}>
                        <p className='text-3xl ml-2'>
                            Login
                        </p>
                    </RouterLink>
                </div>
            )}
            {user && (
                <div className="flex">
                    <p className='text-3xl font-bold mr-7'>{greet}</p>
                    <p className='flex flex-row items-center hover:text-red-700 cursor-pointer text-3xl font-bold' onClick={logout}>
                        Logout
                    </p>
                </div>
            )}
        </div>
    )
}

export default Navbar;