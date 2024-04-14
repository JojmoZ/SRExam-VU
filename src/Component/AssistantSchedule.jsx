import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api";
import { Tooltip } from "react-tooltip";
import Modaldetails from "./modaldetails";

const AssistantSchedule = () => {
  const [assistantSchedules, setAssistantSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [generationFilter, setGenerationFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [generations, setGenerations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTransacid, setSelectedTransacid] = useState(null);
  const [modalPurpose, setModalPurpose] = useState('');
  const [modalVictims, setModalVictims] = useState('');
  const [modalsubject, setModalSubject] = useState('');
  const [modaldate, setModaldate] = useState('');
  useEffect(() => {
    fetchAssist();
  }, []);

  const fetchAssist = async () => {
    try {
      const assistants = await invoke("getAssistants");
      const uniqueGenerations = Array.from(new Set(assistants.map(assistant => assistant.initial.slice(-4))));
      setGenerations(uniqueGenerations);
      console.log(generations);
      const allSchedules = [];
      for (const assistant of assistants) {
        const shifter = await invoke("getShift", { nim: assistant.nim });
        const schedules = await invoke("getSchedule", { nim: assistant.nim });
        const combinedSchedule = [...schedules[0], ...schedules[1]];
        const schedule = combinedSchedule.map((slot) => slot.time);
        const typeofa =  combinedSchedule.map((slot)=>slot.typeoftransac);
        const transacids =  combinedSchedule.map((slot) => slot.transacid);
        console.log("transacids",transacids);
        const subject_codes = combinedSchedule.map((slot) => slot.subject_codeee);
        const dates = combinedSchedule.map((slot) => slot.date);
        allSchedules.push({ initial: assistant.initial, generation: assistant.generation, shift: shifter, schedule:schedule, typeoftransac:typeofa,subject_code:subject_codes, transacid:transacids, date:dates,nim:assistant.nim });
      }
      setAssistantSchedules(allSchedules);
      setFilteredSchedules(allSchedules); 
    } catch (error) {
      console.error("Error fetching assistants:", error);
    }
  };

  const filterSchedule = () => {
    let filtered = assistantSchedules;
    if (generationFilter) {
      filtered = filtered.filter(assistant => assistant.initial.slice(-4) === generationFilter);
    }
    if (searchTerm) {
      filtered = filtered.filter(assistant => assistant.initial.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredSchedules(filtered);
  };

  useEffect(() => {
    filterSchedule();
  }, [generationFilter, searchTerm]);

  const getColumnColorDescription = (timeslot) => {
    console.log(timeslot)
    return timeslot.typeoftransac === "Proctor" ? "This color represents the Proctor schedule" : "This color represents the Exam schedule";
  };

  const getColumnColor = (typeoftransac) => {
    return typeoftransac === "Proctor" ? "bg-green-500" : "bg-orange-500";
  };

  const getColumn = (timeSlot) => {
    const typeoftransac = timeSlot.typeoftransac;
    const time = typeof timeSlot.time === 'string' ? timeSlot.time : ''; 
    const hour = parseInt(time.split(":")[0]);
    if (hour >= 7 && hour < 9) return { column: 0, color: getColumnColor(typeoftransac) };
    if (hour >= 9 && hour < 11) return { column: 1, color: getColumnColor(typeoftransac) };
    if (hour >= 11 && hour < 13) return { column: 2, color: getColumnColor(typeoftransac) };
    if (hour >= 13 && hour < 15) return { column: 3, color: getColumnColor(typeoftransac) };
    if (hour >= 15 && hour < 17) return { column: 4, color: getColumnColor(typeoftransac) };
    if (hour >= 17 && hour < 19) return { column: 5, color: getColumnColor(typeoftransac) };
    return { column: 0, color: getColumnColor(typeoftransac) }; 
  };
  const openModal = (transacid,purpose,nim,subject,date)=>{
    setSelectedTransacid(transacid);
    console.log(purpose);
    setModalPurpose(purpose);
    setShowModal(true);
    setModalVictims(nim);
    setModalSubject(subject);
    setModaldate(date);
  }
  const closeModal = () => {
    setShowModal(false);
};
  const handleScheduleHover = (transacid,nim,subject_code,date) => {
    
    const hoveredStudent = assistantSchedules.find(assistant => assistant.nim === nim);
    console.log(hoveredStudent);
    if (hoveredStudent && hoveredStudent.schedule && hoveredStudent.schedule.length > 0) {
      openModal(parseInt(transacid), 'Info', nim,subject_code, date);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Assistant Schedule</h2>
      <div className="flex mb-4">
        <input
          type="text"
          placeholder="Search by initials..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 border border-gray-400 rounded mr-4"
        />
        <select
          value={generationFilter}
          onChange={(e) => setGenerationFilter(e.target.value)}
          className="px-3 py-2 border bg-slate-500 border-gray-400 rounded mr-4"
        >
          <option value="">Filter by generation</option>
          {generations.map((generation, index) => (
            <option key={index} value={generation}>{generation}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {filteredSchedules.map((assistant, index) => (
          <div key={index} className="bg-gray-900 p-4 mb-4"   onMouseEnter={() => handleScheduleHover(assistant.transacid,assistant.nim, assistant.subject_code, assistant.date)}>
            <h3 className="text-lg font-bold mb-2">{assistant.initial}</h3>
            <p><span className="font-bold">Shift:</span> {assistant.shift}</p>
            <div className="grid grid-cols-6 mt-2">
              {assistant.schedule.map((timeSlot, i) => {
                const { column, color } = getColumn(timeSlot);
                return (
                  <div key={i} className={`px-2 py-1 rounded mr-2 col-span-${column + 1} ${color}`} title={getColumnColorDescription(timeSlot)}>
                    {timeSlot}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {showModal && <Modaldetails transacid={selectedTransacid} purpose={modalPurpose} onClose={closeModal} student={modalVictims}  subject={modalsubject} date={modaldate}/>}
    </div>
  );
};

export default AssistantSchedule;
