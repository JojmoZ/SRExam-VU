import { invoke } from '@tauri-apps/api';
import React, { useEffect, useState } from 'react';

const Modaldetails = ({ transacid, onClose, purpose, student, transacnote,subject,date ,oldseater,myname}) => {
    const [timeExtension, setTimeExtension] = useState('');
    const [extensionReason, setExtensionReason] = useState('');
    const [newReport, setNewReport] = useState({description: "",});
    const [transacdata, setTransacData] = useState({});
    const gettingdata = async () => {
        console.log(transacid);
        console.log(typeof transacid );
        const go = await invoke("gettransacdata", { transacid: parseInt(transacid) });
        setTransacData(go);
    };
    useEffect(() => {
        gettingdata();
    }, []);

    const addtime = async () => {
        try {
            if (!timeExtension || !extensionReason) {
                alert("Please fill in all fields.");
                return;
            }
            if (parseInt(timeExtension) > 20) {
                alert("Time extension must not be more than 20 minutes.");
                return;
            }
            const success = await invoke("timeextendperson", {
                minutes: parseInt(timeExtension),
                reason: extensionReason,
                transacid: parseInt(transacid),
                nim: student
            });

            if (success) {
                onClose();
            } else {
                alert("Failed to give time extension.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred while processing your request.");
        }
    };
    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setNewReport(prevState => ({
            ...prevState,
            [name]: value
        }));
    };
    const handleSubmit = () => {
        const newRole = document.getElementById("newrole").value;
        const validRoles = ["Student", "Assistant", "Subject Development", "Exam Coordinator"];
        if (validRoles.includes(newRole)) {
            invoke("editrole", { newrole:newRole,nim:student }).then(() => {
                console.log("Role updated successfully!");
            }).catch(error => {
                console.error("Error updating role:", error);
            });
        } else {
            alert("Please enter a valid role: Student, Assistant, Subject Development, or Exam Coordinator");
        }
    };
    const addanswer = async () => {
        try {
            const transactionDateTime = new Date(`${transacdata.date} ${transacdata.time}`);
            const transactionEndDateTime = new Date(transactionDateTime.getTime() + 100 * 60000); // 100 minutes after transaction start
            const currentDateTime = new Date();
            if (currentDateTime < transactionDateTime || currentDateTime > transactionEndDateTime) {
                alert("You can only extend time while the transaction is ongoing.");
                return;
            }
            const checker = await invoke("checkfinal",{transcid: parseInt(transacid), nim: student })
            if (checker) {
                alert("You cannot extend time after the exam is over.");
                return;
            }
            const fileInput = document.getElementById('fileInput');
            console.log(fileInput);
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onloadend = async () => {
                console.log(reader.result);
                const base64data = reader.result?.replace(/^data:application\/x-zip-compressed;base64,/, '');
                console.log("base64data", base64data)
                const valid = await invoke('uploadanswer', { fileContentBase64: base64data, transcid: parseInt(transacid), nim: student });
                if (valid === true) {
                    console.log("yes");
                    onClose();
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
    const addchangeseat = async () => {
        const transactionDateTime = new Date(`${transacdata.date} ${transacdata.time}`);
        const transactionEndDateTime = new Date(transactionDateTime.getTime() + 100 * 60000); 
        const currentDateTime = new Date();
        if (currentDateTime < transactionDateTime || currentDateTime > transactionEndDateTime) {
            alert("You can only extend time while the transaction is ongoing.");
            return;
        }
        const newSeat = document.getElementById("newseat").value;
        const reasoning = document.getElementById("reasoning").value;
        const seatExists = await invoke("validateseat", { newseat: parseInt(newSeat), transacid: transacid });
        if (!seatExists) {
            alert("The new seat number already exists. Please choose a different seat.");
            return;
        }
        console.log(typeof student);
        const go = await invoke("changeseating", { newseat: parseInt(newSeat), reasoning: reasoning, nim: student, transacid: transacid });
        if (go) {
            const concat = await invoke("concatnotes",{ newseat: parseInt(newSeat), reasoning: reasoning, nim: student, transacid: transacid , oldseat:oldseater ,name:myname});
            onClose();
        } else {
            alert("Change Seat Not available");
        }
    };
    const downloadAnwer = async () => {
        const checker = await invoke("checkupload",{ transacid: parseInt(transacid), nim: student });
        if(!checker){
            alert("no file uploaded");
        }
        const response = await invoke("downloadstudentanswer", { transacid: parseInt(transacid), nim: student });
        const downloadLink = document.createElement('a');
        downloadLink.href = `data:application/x-zip-compressed;base64,${response}`;
        downloadLink.setAttribute('download', 'question.zip');
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        onClose();
    }

    const addreport = async () => {
        try {
            const transactionDateTime = new Date(`${transacdata.date} ${transacdata.time}`);
            const transactionEndDateTime = new Date(transactionDateTime.getTime() + 100 * 60000);
            const currentDateTime = new Date();
            if (currentDateTime < transactionDateTime || currentDateTime > transactionEndDateTime) {
                alert("You can only extend time while the transaction is ongoing.");
                return;
            }
            const fileInput = document.querySelector('input[name="picture"]');
            const file = fileInput.files[0];
            if (!file) {
                console.error("No file selected");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = async () => {
                console.log("Reader result:", reader.result);
                const base64data = reader.result?.replace(/^data:image\/\w+;base64,/, '');
                console.log("base64:", base64data);
                const response = await invoke('uploadreport', {
                    fileContentBase64: base64data,
                    description: newReport.description,
                    transacid: transacid,
                    nim: student
                });

                if (response) {
                    console.log("Report added successfully");
                    onClose();
                } else {
                    console.error("Failed to add report");
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Error adding report:", error);
        }
    };

    const veriftransac = async () => {
        const pass = document.getElementById("verifid").value;
        if (!pass) {
            return;
        }
        if (pass !== "241241241") {
            return;
        }
        const go = await invoke("addverificator", { transacid: transacid, transacnote: transacnote });
        if (go === true) {
            onClose();
        }
        else {
            alert("verification process stopped");
        }
    }
    return (
        <div className="fixed z-50 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen">
                <div className="fixed inset-0 transition-opacity" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <div className="relative bg-slate-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:max-w-sm sm:w-full sm:p-6">
                    <div className="sm:flex sm:items-start">
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 className="text-lg leading-6 font-medium text-green-900">
                                {purpose === "Add" && "Extend Time"}
                                {purpose === "Report" && "Add Report"}
                                {purpose === "Upload" && "Manual Upload"}
                                {purpose === "Download" && "Download Answer"}
                                {purpose === "Verify" && "Verify Transaction"}
                                {purpose === "Seating" && "Change Seats"}
                                {purpose === "role" && "Edit Role"}
                                {purpose === "Look" && "Evidence"}
                                {purpose === "Info" && "Transac Info"}
                            </h3>
                            {purpose ==="Look" && <p>Photos:</p>}
                            {purpose === "role" && <p></p>}
                            {purpose !== "role" && purpose !=="Look" && <p>Transaction ID: {transacid}</p>}
                            {purpose === "Verify" && <p>Proctor: {student}</p>}
                            {purpose !== "Verify" && purpose !== "role" && purpose !=="Look" && <p>Student : {student}</p>}
                        </div>
                    </div>
                    {purpose === "Add" && <div className=" items-center">
                        <input type="number" value={timeExtension} onChange={(e) => setTimeExtension(e.target.value)} className="mb-4" placeholder="Minutes" /> <br />
                        <input type="text" value={extensionReason} onChange={(e) => setExtensionReason(e.target.value)} className="" placeholder="Reason" />
                        <button onClick={addtime} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">Give Time Extension</button>
                    </div>}
                    {purpose === "Report" &&
                        <>
                            <div>
                                <label>Picture:</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    name="picture"
                                />
                            </div>
                            <div>
                                <label>Description:</label>
                                <textarea
                                    name="description"
                                    onChange={handleInputChange}
                                    className='bg-slate-500'
                                    value={newReport.description}
                                ></textarea>
                            </div>
                            <button onClick={() => addreport(student)}>Submit</button>
                        </>
                    }
                    {purpose === "Upload" && <div className='mt-5'>
                        <label htmlFor="fileInput" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer">
                            Upload Answer
                            <input
                                id="fileInput"
                                type="file"
                                accept=".zip" 
                                style={{ display: 'none' }} 
                                onChange={addanswer}
                            />
                        </label>
                    </div>}
                    {purpose === "Download" && <div className='mt-5'>
                        <button onClick={downloadAnwer} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">
                            Download Answer
                        </button> <br /> <br />
                    </div>}
                    {purpose === "Verify" && <div>
                        <input id="verifid" type="password" />
                        <button onClick={veriftransac}>verify</button>
                    </div>}
                    {purpose === "Seating" && <div> <br />
                        <label htmlFor="newseat">New Seat Number</label>
                        <input type="number" name="" id="newseat" /> <br /> <br />
                        <label htmlFor="reasoning">Reason</label> <br />
                        <input type="text" name="" id="reasoning" /> <br /> <br />
                        <button onClick={addchangeseat}>Submit</button>
                    </div>}
                    {purpose === "role" &&
                        <div>
                            <label htmlFor="newrole">Input New Role</label> <br />
                            <input type="text" id="newrole" /> <br /> <br />
                            <button onClick={handleSubmit}>Submit</button>
                        </div>
                    }
                    {purpose ==="Look" && <div>
                    <img src={`data:image/jpeg;base64,${student}`} alt={"validate wrong"} />
                        </div>}
                        {purpose ==="Info" && <div>
                            <p>{transacid}</p> <br />
                            <p>{subject}</p> <br />
                            <p>{date}</p>
                            </div>}
                    <span className="close absolute top-0 right-0 p-2 cursor-pointer" onClick={onClose}>&times;</span>
                </div>
            </div>
        </div>
    );
};

export default Modaldetails;
