import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api';

const StudentHomePage = () => {
    const [transactions, setTransactions] = useState([]);
    const [user, setUser] = useState(null);

    useEffect(() => {
        invoke("get_current_user").then((currentUser) => {
            setUser(currentUser);
        }).catch(error => {
            console.error("Error fetching current user:", error);
        });
    }, []);

    useEffect(() => {
        if (user) {
            getTransactions(user);
        }
    }, [user]); 
    const getTransactions = async (currentUser) => {
        try {
            const transactionData = await invoke("get_transac_info", { user: currentUser });
            setTransactions(transactionData);
        } catch (error) {
            console.error("Error fetching transaction info:", error);
        }
    };
const isWithinRange = (transactionTime) => {
    const today = new Date();
    const [hours, minutes] = transactionTime.split(":").map(Number); 
    const transactionDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
    const differenceInMinutes = (today - transactionDateTime) / (1000 * 60);
    return differenceInMinutes >= -100 && differenceInMinutes <= 100;
};
    return (
        <div className="container mx-auto text-center">
            <h2 className="text-xl font-semibold mb-4">Transaction Information</h2>
            <div className="overflow-x-auto inline-block">
                {transactions.some(transaction => isWithinRange(transaction.time)) ? (
                    <div>
                            <div>{transaction.subject_code}-{transaction.subject_name}-{transaction.room}={transaction.date}-{transaction.time}-{transaction.seat_number}
                    </div>
                    <div>
                        You can download the Question here 
                        <button>Question </button>
                    </div>
                    <div>
                        you can upload your answer here
                        <input type="file" name="" id="" /> 
                    </div>
                    <div>
                        re check your answer here
                        <button>Your Answer</button> 
                    </div>
                    </div>
                    
                ) : (
                    <table className="table-auto border-collapse border border-gray-300 inline-block">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border bg-slate-700 border-gray-300 px-4 py-2">Subject Code</th>
                                <th className="border bg-slate-700 border-gray-300 px-4 py-2">Subject Name</th>
                                <th className="border bg-slate-700 border-gray-300 px-4 py-2">Room</th>
                                <th className="border bg-slate-700 border-gray-300 px-4 py-2">Date</th>
                                <th className="border bg-slate-700 border-gray-300 px-4 py-2">Time</th>
                                <th className="border bg-slate-700 border-gray-300 px-4 py-2">Seat Number</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((transaction, index) => (
                                <tr key={index} className={index % 2 === 0 ? "bg-gray-100" : "bg-white"}>
                                    <td className="border bg-slate-500 border-gray-300 px-4 py-2">{transaction.subject_code}</td>
                                    <td className="border bg-slate-500 border-gray-300 px-4 py-2">{transaction.subject_name}</td>
                                    <td className="border bg-slate-500 border-gray-300 px-4 py-2">{transaction.room}</td>
                                    <td className="border bg-slate-500 border-gray-300 px-4 py-2">{transaction.date}</td>
                                    <td className="border bg-slate-500 border-gray-300 px-4 py-2">{transaction.time}</td>
                                    <td className="border bg-slate-500 border-gray-300 px-4 py-2">{transaction.seat_number}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default StudentHomePage;
