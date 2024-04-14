import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api';
import { useNavigate } from "react-router-dom";

const NoStudentHomePage = () => {
  const [user, setUser] = useState(null);
  const [transactlist, setTransactlist] = useState([]);
  const [showAllTransactions, setShowAllTransactions] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    invoke("get_current_user").then((test) => {
      setUser(test);
    });
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        let transactionData = [];
        if (showAllTransactions) {
          transactionData = await invoke("assisttrans", { user: user });
        } else {
          transactionData = await invoke("futureassist", { user: user });
        }
        setTransactlist(transactionData);
      } catch (error) {
        console.error("Error fetching transaction info:", error);
      }
    };

    if (user && user.role === "Assistant") {
      fetchTransactions();
    }
  }, [user, showAllTransactions]);

  const handleTransactionDetailClick = (transactionId) => {
    navigate(`/Transacdetail/${transactionId}`);
  };

  const toggleTransactions = () => {
    setShowAllTransactions(!showAllTransactions);
  };

  const getRowColor = (date) => {
    const transactionDate = new Date(date);
    const today = new Date();
    if (showAllTransactions) {
      if (transactionDate > today) {
        console.log("Transaction date is in the future");
        return "bg-red-600"; 
      } else {
        console.log("Transaction date is in the past");
        return "bg-green-600"; 
      }
    } else {
      if (transactionDate > today) {
        console.log("Transaction date is in the future");
        return "bg-green-600";
      } else {
        console.log("Transaction date is in the past");
        return "bg-red-600"; 
      }
    }
  };

  return (
    <div className='flex flex-col'>
      <button onClick={toggleTransactions} className="my-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700">
        {showAllTransactions ? 'See All Future Transactions' : 'See All Transactions'}
      </button>
      {user && user.role === "Assistant" && transactlist.length > 0 ? (
        <table className="table-auto border-collapse border border-gray-300 inline-block">
          <thead>
            <tr className="bg-gray-200">
              <th className="border bg-slate-700 border-gray-300 px-4 py-2">Subject Code</th>
              <th className="border bg-slate-700 border-gray-300 px-4 py-2">Subject Name</th>
              <th className="border bg-slate-700 border-gray-300 px-4 py-2">Room</th>
              <th className="border bg-slate-700 border-gray-300 px-4 py-2">Date</th>
              <th className="border bg-slate-700 border-gray-300 px-4 py-2">Time</th>
              <th className="border bg-slate-700 border-gray-300 px-4 py-2">Classes</th>
              <th className="border bg-slate-700 border-gray-300 px-4 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {transactlist.map((transact, index) => (
              <tr key={index} className={getRowColor(transact.date)} >
                <td className="border  border-gray-300 px-4 py-2">{transact.subject_code}</td>
                <td className="border  border-gray-300 px-4 py-2">{transact.subject_name}</td>
                <td className="border  border-gray-300 px-4 py-2">{transact.room}</td>
                <td className="border  border-gray-300 px-4 py-2">{transact.date}</td>
                <td className="border  border-gray-300 px-4 py-2">{transact.time}</td>
                <td className="border  border-gray-300 px-4 py-2">{transact.classes}</td>
                <td className="border  border-gray-300 px-4 py-2">
                  <button onClick={() => handleTransactionDetailClick(transact.transacid)} className="text-blue-600 underline">Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="flex justify-center items-center h-screen font-bold text-4xl">
          You have no unfinished proctoring schedule
        </div>
      )}
    </div>
  );
};

export default NoStudentHomePage;
