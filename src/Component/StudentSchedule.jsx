import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api";
import { Tooltip } from "react-tooltip";
import Modaldetails from "./modaldetails";

const StudentSchedule = () => {
  const [studentSchedules, setStudentSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredSchedule, setHoveredSchedule] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTransacid, setSelectedTransacid] = useState(null);
  const [modalPurpose, setModalPurpose] = useState('');
  const [modalVictims, setModalVictims] = useState('');
  const [modalsubject, setModalSubject] = useState('');
  const [modaldate, setModaldate] = useState('');
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const students = await invoke("getusers");
      const allSchedules = [];
      for (const student of students) {
        const schedules = await invoke("getStudentSchedule", { nim: student.nim });
        const schedule = schedules.map((slot) => slot.time);
        const typeofa = schedules.map((slot) => slot.typeoftransac);
        const transacids =  schedules.map((slot) => slot.transacid);
        const subject_codes = schedules.map((slot) => slot.subject_codeee);
        const dates = schedules.map((slot) => slot.date);
        allSchedules.push({ nim: student.nim, schedule: schedule, typeoftransac: typeofa ,subject_code:subject_codes, transacid:transacids, date:dates});
      }
      setStudentSchedules(allSchedules);
      setFilteredSchedules(allSchedules);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
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
  const filterSchedule = () => {
    let filtered = studentSchedules;
    if (searchTerm) {
      filtered = filtered.filter(student => student.nim.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredSchedules(filtered);
  };

  useEffect(() => {
    filterSchedule();
  }, [searchTerm]);

  const handleScheduleHover = (nim,transacid,subject_code,date) => {
    const hoveredStudent = studentSchedules.find(student => student.nim === nim);
    if (hoveredStudent && hoveredStudent.schedule && hoveredStudent.schedule.length > 0) {
      openModal(parseInt(transacid), 'Info', nim,subject_code, date);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Student Schedule</h2>
      <div className="flex mb-4">
        <input
          type="text"
          placeholder="Search by initials..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 border border-gray-400 rounded mr-4"
        />
      </div>
      <div className="grid grid-cols-9 gap-4">
        {filteredSchedules.map((student, index) => (
          <div
            key={index}
            className="bg-gray-900 p-4 mb-4"
            onMouseEnter={() => handleScheduleHover(student.nim,student.transacid, student.subject_code, student.date)}
          >
            <h3 className="text-lg font-bold mb-2">{student.nim}</h3>
            <div className="mt-2">
              <p className="font-bold">Schedule:</p>
              <ul>
                {student.schedule.map((timeSlot, i) => (
                  <li key={i}>{timeSlot} - {student.typeoftransac[i]}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      {showModal && <Modaldetails transacid={selectedTransacid} purpose={modalPurpose} onClose={closeModal} student={modalVictims}  subject={modalsubject} date={modaldate}/>}
                                                                           
    </div>
  );
};

export default StudentSchedule;
