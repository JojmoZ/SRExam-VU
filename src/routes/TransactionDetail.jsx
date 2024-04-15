import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api';
import Modaldetails from '../Component/modaldetails';
const TransactionDetail = () => {
    const [user, setUser] = useState();
    const [showModal, setShowModal] = useState(false);
    const [selectedTransacid, setSelectedTransacid] = useState(null);
    const [modalPurpose, setModalPurpose] = useState('');
    const [modalVictims, setModalVictims] = useState('');
    const { transactionId } = useParams();
    const [transacdata, setTransacData] = useState({});
    const [transdet, setTransDet] = useState([]);
    const [showStudentMapping, setShowStudentMapping] = useState(true);
    const [timeExtension, setTimeExtension] = useState('');
    const [extensionReason, setExtensionReason] = useState('');
    const [transactionNote, setTransactionNote] = useState('');
    const [seatnumber,setSeatNumber] =useState('');
    const [name,setName]=  useState('');
    const [transacnote,setTransacnote]= useState('None');
    const navigate = useNavigate();
    useEffect(() => {
        invoke("get_current_user").then((test) => {
            if (test !== null) {
                setUser(test);
            }
        });
    }, []);
    const openModal = (transacid, purpose, nim) => {
        setSelectedTransacid(transacid);
        setModalPurpose(purpose);
        setModalVictims(nim);
        setShowModal(true);
    };
    const openModal2 = (transacid, purpose, nim,seatnumber,name) => {
        setSelectedTransacid(transacid);
        setModalPurpose(purpose);
        setModalVictims(nim);
        setSeatNumber(seatnumber);
        setName(name);
        setShowModal(true);
    };
    const closeModal = () => {
        setShowModal(false);
    };
    const gettingdata = async () => {
        const go = await invoke("gettransacdata", { transacid: parseInt(transactionId) });
        const gone = await invoke("gettransacdetails", { transacid: parseInt(transactionId) });
        console.log(go);
        console.log(gone);
        setTransacData(go);
        setTransDet(gone);
    };
    useEffect(() => {
        gettingdata();
        
    }, []);
    
    const handleGoBack = () => {
        navigate('/home');
    };

    const toggleShowStudentMapping = () => {
        setShowStudentMapping(!showStudentMapping);
    };
    useEffect(() => {
        gettransacnote();
    }, [transacnote]);
    
    const gettransacnote = async () => {
        const go = await invoke("gettransacnote", { transacid: parseInt(transactionId) });
        if (go !== null) {
            setTransacnote(go);
        } else {
            // Handle the case when the value is null
            setTransacnote(""); // Or set it to some default value
        }
    }
    const appendTransactionNote = async (note) => {
        const append =await invoke("appendnote",{transacid: parseInt(transactionId), note:note});
        if(append) {
            gettransacnote();
            console.log("7yes");
        }
        else{
            console.log("no");
        }
    };
    const isTransactionDateTimePassed = () => {
        const transactionDateTime = new Date(`${transacdata.date} ${transacdata.time}`);
        const transactionEndDateTime = new Date(transactionDateTime.getTime() + 100 * 60000); 
        const currentDateTime = new Date();

     
        const verificationStartTime = new Date(transactionEndDateTime.getTime() - 30 * 60000);
        const verificationEndTime = new Date(transactionEndDateTime.getTime() + 30 * 60000); 
        const isWithinVerificationWindow = currentDateTime >= verificationStartTime && currentDateTime <= verificationEndTime;

    
        if (timeExtension) {
            const extendedVerificationEndTime = new Date(verificationEndTime.getTime() + parseInt(timeExtension) * 60000);
            return currentDateTime > extendedVerificationEndTime; 
        }

        return currentDateTime > verificationEndTime || !isWithinVerificationWindow;
    };

    const downloadQuestion = async () => {
        const questioncheck = await invoke("question_check", { transacid: parseInt(transactionId) });
        if(!questioncheck)
        {
            alert("no question to be downloaaded");
            return;
        }
    
        if (user && user.role === 'Assistant') {
            const transactionDateTime = new Date(`${transacdata.date} ${transacdata.time}`);
            const transactionEndDateTime = new Date(transactionDateTime.getTime() + 100 * 60000);
            const currentDateTime = new Date();
            if (currentDateTime >= transactionDateTime && currentDateTime <= transactionEndDateTime) {
                const response = await invoke("download_question", { transcid: parseInt(transactionId) });
                const downloadLink = document.createElement('a');
                downloadLink.href = `data:application/x-zip-compressed;base64,${response}`;
                downloadLink.setAttribute('download', 'question.zip');
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            } else {
                alert('You can only download the question during the transaction time.');
            }
        } else {
            const response = await invoke("download_question", { transcid: parseInt(transactionId) });
            const downloadLink = document.createElement('a');
            downloadLink.href = `data:application/x-zip-compressed;base64,${response}`;
            downloadLink.setAttribute('download', 'question.zip');
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };
    const uploadquestion = async () => {
        try {
            const fileInput = document.getElementById('fileInput'); 
            console.log(fileInput);
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onloadend = async () => {
                console.log(reader.result);
                const base64data = reader.result?.replace(/^data:application\/x-zip-compressed;base64,/, '');
                console.log("base64data", base64data)
                const valid = await invoke('uploadquestion', { fileContentBase64: base64data, transcid: parseInt(transactionId) });
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
    };

    const addTimeExtensionClass = async () => {
        try {
            if (!timeExtension || !extensionReason) {
                alert("Please fill in all fields.");
                return;
            }
            if (parseInt(timeExtension) > 20) {
                alert("Time extension must not be more than 20 minutes.");
                return;
            }
    
            const transactionDateTime = new Date(`${transacdata.date} ${transacdata.time}`);
            const transactionEndDateTime = new Date(transactionDateTime.getTime() + 100 * 60000);  
            const currentDateTime = new Date();
    
         
            if (currentDateTime < transactionDateTime || currentDateTime > transactionEndDateTime) {
                alert("You can only extend time while the transaction is ongoing.");
                return;
            }
    
          
            const success = await invoke("timeextendclass", {
                minutes: parseInt(timeExtension),
                reason: extensionReason,
                transacid: parseInt(transactionId)
            });
    
            if (success) {
                const note = `${timeExtension} minutes given because ${extensionReason}`;
                appendTransactionNote(note);
                setTimeExtension('');
                setExtensionReason('');
            } else {
                alert("Failed to give time extension.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred while processing your request.");
        }
    };
    
    return (
        <>

            <div className="flex flex-col items-center">
                <button onClick={handleGoBack} className="absolute top-0 left-0 m-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">Go Back</button>
                <h2 className="text-xl font-bold mt-4 mb-8">Transaction Detail</h2>
                <div className="flex items-start">
                    <div className="flex flex-row mb-4 mr-5">
                        <p className="mr-4"><strong>Subject Code: {transacdata.subject_code}</strong> </p>
                        <p><strong>Subject Name: {transacdata.subject_name}</strong> </p>
                    </div>
                    <div className="flex flex-row mb-4 mr-5">
                        <p className="mr-4"><strong>Assigned Class: {transacdata.classes}</strong> </p>
                        <p><strong>Room: {transacdata.room_number}</strong> </p>
                    </div>
                    <div className="flex flex-row mb-4">
                        <p className="mr-4"><strong>Date: {transacdata.date}</strong> </p>
                        <p><strong>Time: {transacdata.time}</strong> </p>
                    </div>
                </div>
            </div>
            <div className="mt-8">
                <h3 className="text-lg font-bold mb-2">Download Transaction Case</h3>
                {user && user.role === 'Assistant' ? (
                    <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 " onClick={downloadQuestion}>Download Question</button>
                ) : (
                    <>
                        <button onClick={downloadQuestion} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">
                            Download Question
                        </button> <br /> <br />
                        <label htmlFor="fileInput" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer">
                            Upload Question
                            <input
                                id="fileInput"
                                type="file"
                                accept=".zip"
                                style={{ display: 'none' }}
                                onChange={uploadquestion}
                            />
                        </label>
                    </>
                )}
            </div>
            <div className="mt-8">
                <button onClick={toggleShowStudentMapping} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">
                    {showStudentMapping ? 'Show Student Mapping' : 'Show Student Details'}
                </button>
            </div>
            {showStudentMapping ? (
                <div className="mt-8 grid grid-cols-10 gap-4 ">
                    {transdet.map((student, index) => (
                        <div key={index} className="border p-2" onClick={() => openModal2(parseInt(transactionId), 'Seating', student.nim,student.seatnumber,student.name)}>
                            <p><strong>NIM: {student.nim}</strong></p>
                            <p><strong>Name: {student.name}</strong></p>
                            <p><strong>Seat Number: {student.seatnumber}</strong></p>
                           
                        </div>
                    ))}
                    {showModal && <Modaldetails transacid={selectedTransacid} purpose={modalPurpose} onClose={closeModal} student={modalVictims} transacnote={transactionNote} oldseater={seatnumber} myname={name}/>}
                </div>
            ) : (
                <div className="mt-8">
                    <table className="w-full border-collapse border border-gray-200">
                        <thead>
                            <tr>
                                <th className="border border-gray-200 px-4 py-2">#</th>
                                <th className="border border-gray-200 px-4 py-2">Student NIM</th>
                                <th className="border border-gray-200 px-4 py-2">Student Name</th>
                                <th className="border border-gray-200 px-4 py-2">Student Seat</th>
                                <th className="border border-gray-200 px-4 py-2">Submission Status</th>
                                <th className="border border-gray-200 px-4 py-2">Time Extension</th>
                                <th className="border border-gray-200 px-4 py-2">Offense</th>
                                <th className="border border-gray-200 px-4 py-2">Manual Upload</th>
                                <th className="border border-gray-200 px-4 py-2">Download Answer</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transdet.map((student, index) => (
                                <tr key={index}>
                                    <td className="border border-gray-200 px-4 py-2">{index + 1}</td>
                                    <td className="border border-gray-200 px-4 py-2">{student.nim}</td>
                                    <td className="border border-gray-200 px-4 py-2">{student.name}</td>
                                    <td className="border border-gray-200 px-4 py-2">{student.seatnumber}</td>
                                    <td className="border border-gray-200 px-4 py-2">{student.submitstat}</td>
                                    <td className="border border-gray-200 px-4 py-2">
                                        <button onClick={() => openModal(parseInt(transactionId), 'Add', student.nim)}>Add</button>
                                    </td>
                                    <td className="border border-gray-200 px-4 py-2">
                                        <button onClick={() => openModal(parseInt(transactionId), 'Report', student.nim)}>Report</button>
                                    </td>
                                    <td className="border border-gray-200 px-4 py-2">
                                        <button onClick={() => openModal(parseInt(transactionId), 'Upload', student.nim)}>Upload</button>
                                    </td>
                                    <td className="border border-gray-200 px-4 py-2">
                                        <button onClick={() => openModal(parseInt(transactionId), 'Download', student.nim)}>Download</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                      

                    </table>
                    {showModal && <Modaldetails transacid={selectedTransacid} purpose={modalPurpose} onClose={closeModal} student={modalVictims} transacnote={transactionNote} />}
                    <div>
                        <div className="flex items-center">
                            <input type="number" value={timeExtension} onChange={(e) => setTimeExtension(e.target.value)} className="mr-4" placeholder="Minutes" />
                            <input type="text" value={extensionReason} onChange={(e) => setExtensionReason(e.target.value)} className="mr-4" placeholder="Reason" />
                            <button onClick={addTimeExtensionClass} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">Give Time Extension</button>
                        </div>
                        <div className="mt-8">
                            <h3 className="text-lg font-bold mb-2">Transaction Notes</h3>
                            <p id="transactionNotes">{transacnote}</p>
                        </div>
                        <div className="mt-8">
                            <textarea rows="4" className="bg-slate-600 mb-4" placeholder="Add transaction notes" id="textarea"></textarea> <br />
                            <button onClick={() => appendTransactionNote(document.getElementById('textarea').value)} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">Add Transaction Notes</button>
                        </div>
                        <div className="mt-8">
                            <button onClick={() => openModal(parseInt(transactionId), 'Verify', user.nim, transactionNote)} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">Verify Transaction</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TransactionDetail;
