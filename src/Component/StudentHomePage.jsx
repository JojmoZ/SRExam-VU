import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api';
import Modaldetails from './modaldetails';

const StudentHomePage = () => {
    const [transactions, setTransactions] = useState([]);
    const [user, setUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedTransacid, setSelectedTransacid] = useState(null);
    const [modalPurpose, setModalPurpose] = useState('');
    const [final, setFinal] = useState(false); 
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

    const isWithinRange = (transactionTime, transactionDate) => {
        const today = new Date();
        const [transactionHours, transactionMinutes] = transactionTime.split(":").map(Number);
        
        const [transactionYear, transactionMonth, transactionDay] = transactionDate.split("-").map(Number);
        const transactionDateTime = new Date(transactionYear, transactionMonth - 1, transactionDay, transactionHours, transactionMinutes);
        
        const differenceInMinutes = (today - transactionDateTime) / (1000 * 60);
        
        return differenceInMinutes >= 0 && differenceInMinutes <= 100;
    };

    const downloadQuestion = async (transacid) => {
        const response = await invoke("download_question", { transcid: parseInt(transacid) });
        const downloadLink = document.createElement('a');
        downloadLink.href = `data:application/x-zip-compressed;base64,${response}`;
        downloadLink.setAttribute('download', 'question.zip');
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
    const uploadanswer = async (tranascid) => {
        try {
            const fileInput = document.getElementById('fileInput'); 
            console.log(fileInput);
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onloadend = async () => {
                console.log(reader.result);
                const base64data = reader.result?.replace(/^data:application\/x-zip-compressed;base64,/, '');
                console.log("base64data", base64data)
                const valid = await invoke('uploadanswer', { fileContentBase64: base64data, transcid: parseInt(tranascid) ,nim:user.nim});
                if (valid === true) {
                    console.log("yes");
                }
                else {
                    console.log("nooooo")
                }
            };
            reader.readAsDataURL(file); 
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    }
    const downloadAnswer = async(transacid) => {
        const response = await invoke("downloadstudentanswer", { transacid: parseInt(transacid) ,nim:user.nim});
        const downloadLink = document.createElement('a');
        downloadLink.href = `data:application/x-zip-compressed;base64,${response}`;
        downloadLink.setAttribute('download', 'answer.zip');
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
    const finalize = async (transacid) => {
        const go = await invoke("finalize", { transacid: parseInt(transacid), nim: user.nim })
        if (go === true) {
            setFinal(go);
            console.log(final);
        }
    }
    const openModal = (transacid, purpose) => {
        console.log("trseses")
        setSelectedTransacid(transacid);
        setModalPurpose(purpose);
        setShowModal(true);
    }
    const closeModal = () => {
        setShowModal(false);
    };
    return (
        <div className="container mx-auto text-center">
            <h2 className="text-xl font-semibold mb-4">Transaction Information</h2>
            <div className="overflow-x-auto inline-block">
                {transactions.some(transaction => isWithinRange(transaction.time,transaction.date)) ? (
                   <div>
                   {transactions.map((transaction, index) => (
                       <div key={index}>
                           <div>{transaction.subject_code}-{transaction.subject_name}-{transaction.room}-{transaction.date}-{transaction.time}-{transaction.seat_number}</div>
                           <div className='flex  justify-evenly items-center mb-9'>
                               <p>You can download the Question here</p>
                               <button className="bg-blue-500 hover:bg-blue-700" onClick={()=>downloadQuestion(transaction.transacid)}>Question</button>
                           </div>
                           <div className='flex  justify-evenly items-center mb-9'>
                               <p> you can upload your answer here</p>
                               <label htmlFor="fileInput" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer">
                                   Upload Answer
                                   <input
                                       id="fileInput"
                                       type="file"
                                       accept=".zip"
                                       style={{ display: 'none' }}
                                       onChange={()=>uploadanswer(transaction.transacid)}
                                       disabled={final === true}
                                   />
                               </label>
                           </div>
                           <div className='flex  justify-evenly items-center mb-9'>
                                <p>check your answer here</p>
                               <button className="bg-blue-500 hover:bg-blue-700" onClick={()=>downloadAnswer(transaction.transacid)}>Answer</button>
                           </div>
                           <div className='flex  justify-evenly items-center mb-9'>
                               <p>Finalize Your Work </p>
                               <button  className="bg-blue-500 hover:bg-blue-700" onClick={() => openModal(parseInt(transaction.transacid), 'finalize')} disabled={final === true}>Finalize</button>
                           </div>
                           {showModal && <Modaldetails transacid={selectedTransacid} purpose={modalPurpose} onClose={closeModal} finalfunction={finalize}/>}
                       </div>
                   ))}
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
