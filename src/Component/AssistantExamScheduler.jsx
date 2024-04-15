import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api';
import PopUpModal2 from './PopUpModal2';
const AssistantScheduler = () => {
    const [assistants, setAssistants] = useState([]);
    const [selectedAssistants, setSelectedAssistants] = useState([]);
    const [generations, setGenerations] = useState([]);
    const [selectedGenerations, setSelectedGenerations] = useState([]);
    const [transaclist, setTransaclist] = useState([]);
    const [selectedTransactions, setSelectedTransactions] = useState([]);
    const [submitEnabled, setSubmitEnabled] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [assignedAssistants, setAssignedAssistants] = useState([]);
    useEffect(() => {
        fetchAssistants();
        fetchTransaclist();
    }, []);

    useEffect(() => {
        if (selectedTransactions.length > 0 && selectedAssistants.length > 0) {
            setSubmitEnabled(true);
        } else {
            setSubmitEnabled(false);
        }
    }, [selectedTransactions, selectedAssistants]);
    const fetchAssistants = async () => {
        try {
            const fetchedAssistants = await invoke('getAssistants');
            const filteredAssistants = fetchedAssistants.filter(assistant => 
                assistant.role !== 'Subject Development' && 
                assistant.role !== 'Exam Coordinator'
            );
            setAssistants(filteredAssistants);
            const uniqueGenerations = Array.from(new Set(filteredAssistants.map(assistant => assistant.initial.slice(-4))));
            setGenerations(uniqueGenerations);
        } catch (error) {
            console.error('Error fetching assistants:', error);
        }
    };
    const fetchTransaclist = async () => {
        try {
            const fetchedTransaclist = await invoke('getTransaclist');
            setTransaclist(fetchedTransaclist);
        } catch (error) {
            console.error('Error fetching transaclist:', error);
        }
    };
    const handleGenerationSelect = (generation) => {
        if (selectedGenerations.includes(generation)) {
            setSelectedGenerations(selectedGenerations.filter(selectedGeneration => selectedGeneration !== generation));
        } else {
            setSelectedGenerations([...selectedGenerations, generation]);
        }
        const assistantsInGeneration = assistants.filter(assistant => assistant.initial.endsWith(generation));
        const selectedAssistantsInGeneration = selectedAssistants.filter(selectedAssistant =>
            assistantsInGeneration.some(assistant => assistant.initial === selectedAssistant.initial)
        );

        if (selectedAssistantsInGeneration.length === assistantsInGeneration.length) {
            setSelectedAssistants(selectedAssistants.filter(selectedAssistant =>
                !assistantsInGeneration.some(assistant => assistant.initial === selectedAssistant.initial)
            ));
        } else {
            setSelectedAssistants([...selectedAssistants, ...assistantsInGeneration]);
        }
    };
    const handleAssistantCheckboxChange = (assistant) => {
        if (selectedAssistants.includes(assistant)) {
            setSelectedAssistants(selectedAssistants.filter(selectedAssistant => selectedAssistant !== assistant));
        } else {
            setSelectedAssistants([...selectedAssistants, assistant]);
        }
    };
    const handleTransactionSelect = (transaction) => {
        if (selectedTransactions.includes(transaction)) {
            setSelectedTransactions(selectedTransactions.filter(selectedTransaction => selectedTransaction !== transaction));
        } else {
            setSelectedTransactions([...selectedTransactions, transaction]);
        }
    };
    const handleassistalgo = async () => {      
        try {
            const assistlist = await invoke("assis_algo", {
                transactions: selectedTransactions,
                assistants: selectedAssistants
            });
            console.log(assistlist);
            setAssignedAssistants(assistlist);
            console.log(assignedAssistants.time);
          setShowPopup(true);
        } catch (error) {
            setShowPopup(false);
          console.error(error);
        }
      };
    const closepopup = () => {
        setShowPopup(false);
    }
    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Assistant Scheduler</h2>
            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2">Select Transactions</h3>
                <div className="grid grid-cols-4 gap-4">
                    {transaclist.map((transaction, index) => (
                        <div key={index} className="col-span-1">
                            <input
                                type="checkbox"
                                id={transaction.subject_code}
                                value={transaction.subject_code}
                                checked={selectedTransactions.includes(transaction)}
                                onChange={() => handleTransactionSelect(transaction)}
                                className="mr-2"
                            />
                            <label htmlFor={transaction.subject_code}>{transaction.subject_code} - {transaction.room} - {transaction.date} - {transaction.time}</label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2">Select Assistants</h3>
                <div className="flex space-x-2 justify-center">
                    {generations.map((generation, index) => (
                        <button
                            key={index}
                            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                                selectedGenerations.includes(generation) ? 'bg-blue-700' : ''
                            }`}
                            onClick={() => handleGenerationSelect(generation)}
                        >
                            {generation}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-9 gap-4 mt-4">
                    {assistants.map((assistant, index) => (
                        <div key={index} className="col-span-1">
                            <input
                                type="checkbox"
                                id={assistant.initial}
                                value={assistant.initial}
                                checked={selectedAssistants.includes(assistant)}
                                onChange={() => handleAssistantCheckboxChange(assistant)}
                                className="mr-2"
                            />
                            <label htmlFor={assistant.initial}>{assistant.initial}</label>
                        </div>
                    ))}
                </div>
            </div>
            {submitEnabled && (
                <div>
                    
                    <button onClick={handleassistalgo} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Submit</button>
                </div>
            )}
               {showPopup && (
                <PopUpModal2 assignedAssistants={assignedAssistants}  stoppop = {closepopup} />
)}
        </div>
    );
};

export default AssistantScheduler;
