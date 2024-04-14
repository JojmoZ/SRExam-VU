import { invoke } from '@tauri-apps/api';
import React, { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import Navbar from '../Component/Navbar';
const Reportmanagement = () => {
  const [transactlist, setTransactlist] = useState([]);
  const [filters, setFilters] = useState({
    date: '',
    room_number: '',
    subject_code: '',
    subject_name: '',
    proctor: '',
    status: '' 
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    let transactionData = await invoke("reportmanage");
    setTransactlist(transactionData);
  };

  const handleTransactionDetailClick = (transactionId) => {
    navigate(`/Reportmanagdetail/${transactionId}`);
  };

  const applyFilters = async () => {
    let filteredTransactions = await invoke("filterreportmanagement", {criteria: filters});
    setTransactlist(filteredTransactions);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };
  
  return (
    <>
      <Navbar />
        <div className="mb-4 flex flex-wrap justify-between w-full">
          <input type="text" name="date" value={filters.date} onChange={handleInputChange} placeholder="Date" className="p-2 mr-2 mb-2 w-full md:w-auto" />
          <input type="text" name="room_number" value={filters.room_number} onChange={handleInputChange} placeholder="Room" className="p-2 mr-2 mb-2 w-full md:w-auto" />
          <input type="text" name="subject_code" value={filters.subject_code} onChange={handleInputChange} placeholder="Subject Code" className="p-2 mr-2 mb-2 w-full md:w-auto" />
          <input type="text" name="subject_name" value={filters.subject_name} onChange={handleInputChange} placeholder="Subject Name" className="p-2 mr-2 mb-2 w-full md:w-auto" />
          <input type="text" name="proctor" value={filters.proctor} onChange={handleInputChange} placeholder="Proctor" className="p-2 mr-2 mb-2 w-full md:w-auto" />
          <input type="text" name="status" value={filters.status} onChange={handleInputChange} placeholder="(ongoing/finished/unfinished)" className="p-2 mr-2 mb-2 w-full md:w-auto" /> {/* Add status input */}
          <button onClick={applyFilters} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">Apply Filters</button>
        </div> 
        <div className='flex justify-center'>
        <table className="table-auto border-collapse border border-gray-300 inline-block">
          <thead>
            <tr className="bg-gray-200">
              <th className="border bg-slate-700 border-gray-300 px-4 py-2">Subject Code</th>
              <th className="border bg-slate-700 border-gray-300 px-4 py-2">Subject Name</th>
              <th className="border bg-slate-700 border-gray-300 px-4 py-2">Room</th>
              <th className="border bg-slate-700 border-gray-300 px-4 py-2">Date</th>
              <th className="border bg-slate-700 border-gray-300 px-4 py-2">Time</th>
              <th className="border bg-slate-700 border-gray-300 px-4 py-2">Classes</th>
              <th className='border bg-slate-700 border-gray-300 px-4 py-2'>Proctor</th>
              <th className="border bg-slate-700 border-gray-300 px-4 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {transactlist.map((transact, index) => (
              <tr key={index} >
                <td className="border  border-gray-300 px-4 py-2">{transact.subject_code}</td>
                <td className="border  border-gray-300 px-4 py-2">{transact.subject_name}</td>
                <td className="border  border-gray-300 px-4 py-2">{transact.room}</td>
                <td className="border  border-gray-300 px-4 py-2">{transact.date}</td>
                <td className="border  border-gray-300 px-4 py-2">{transact.time}</td>
                <td className="border  border-gray-300 px-4 py-2">{transact.classes}</td>
                <td className='border  border-gray-300 px-4 py-2'>{transact.proctor}</td>
                <td className="border  border-gray-300 px-4 py-2">
                  <button onClick={() => handleTransactionDetailClick(transact.transacid)} className="text-blue-600 underline">Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      
    </>
  )
}

export default Reportmanagement