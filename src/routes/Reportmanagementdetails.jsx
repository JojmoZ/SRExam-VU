import { invoke } from '@tauri-apps/api';
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom';
import Modaldetails from '../Component/modaldetails';
const Reportmanagementdetails = () => {
  const { transactionId } = useParams();
  const [transacdata, setTransacData] = useState({});
  const [transdet, setTransDet] = useState([]);
  const navigate = useNavigate();
   const [showModal, setShowModal] = useState(false);
    const [selectedTransacid, setSelectedTransacid] = useState(null);
    const [modalPurpose, setModalPurpose] = useState('');
    const [modalVictims, setModalVictims] = useState('');
   const [proctorinitial,setInitial]= useState('');
  const gettingdata = async () => {
    const go = await invoke("gettransacdata", { transacid: parseInt(transactionId) });
    const gone = await invoke("getreportdetails", { transacid: parseInt(transactionId) });
    console.log(go);
    console.log(gone);
    setTransacData(go);
    setTransDet(gone);
};
const getinit = async () =>{
  const go =  await invoke("get_initial_from_nim",{ nim:transacdata.proctor});
  console.log(go);
    setInitial(go);
}
useEffect(() => {
    gettingdata();
}, []);
useEffect(()=>{
  getinit();
})
  const handleGoBack = () => {
    navigate('/Reportmanag');
};
const openModal = (transacid, purpose, nim) => {
  setSelectedTransacid(transacid);
  setModalPurpose(purpose);
  setShowModal(true);
  setModalVictims(nim);
};
const closeModal = () => {
  setShowModal(false);
};

  return (
    <>
        <div className="flex flex-col items-center">
            <button onClick={handleGoBack} className="absolute top-0 left-0 m-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">Go Back</button>
            <h2 className="text-xl font-bold mt-4 mb-8">Report Management Detail</h2>
            <div className="flex items-start">
                <div className="flex flex-row mb-4 mr-5">
                    <p className="mr-4"><strong>Subject Code: {transacdata.subject_code}</strong> </p>
                    <p><strong>Subject Name: {transacdata.subject_name}</strong> </p>
                </div>
                <div className="flex flex-row mb-4 mr-5">
                    <p className="mr-4"><strong>Proctor: {proctorinitial}</strong> </p>
                    <p><strong>Room: {transacdata.room_number}</strong> </p>
                </div>
                <div className="flex flex-row mb-4">
                    <p className="mr-4"><strong>Date: {transacdata.date}</strong> </p>
                    <p><strong>Time: {transacdata.time}</strong> </p>
                </div>
            </div>
        </div>
        <div className="mt-8">
                    <table className="w-full border-collapse border border-gray-200">
                        <thead>
                            <tr>
                                <th className="border border-gray-200 px-4 py-2">#</th>
                                <th className="border border-gray-200 px-4 py-2">Student NIM</th>
                                <th className="border border-gray-200 px-4 py-2">Student Name</th>
                                <th className="border border-gray-200 px-4 py-2">Student Seat</th>
                                <th className="border border-gray-200 px-4 py-2">Notes</th>
                                <th className="border border-gray-200 px-4 py-2">Offense Photos</th>
                         </tr>
                        </thead>
                        <tbody>
                            {transdet.map((student, index) => (
                                <tr key={index}>
                                    <td className="border border-gray-200 px-4 py-2">{index + 1}</td>
                                    <td className="border border-gray-200 px-4 py-2">{student.nim}</td>
                                    <td className="border border-gray-200 px-4 py-2">{student.name}</td>
                                    <td className="border border-gray-200 px-4 py-2">{student.seatnumber}</td>
                                    <td className="border border-gray-200 px-4 py-2">{student.reportreason}</td>
                                    <td className="border border-gray-200 px-4 py-2">
                                        <button onClick={() => openModal(parseInt(transactionId), 'Look', student.photos)}>See Photos</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                      

                    </table>
                    {showModal && <Modaldetails transacid={selectedTransacid} purpose={modalPurpose} onClose={closeModal} student={modalVictims} />}
                    </div>
        </>
  )
}

export default Reportmanagementdetails