import React, { useEffect, useState } from 'react';
import Navbar from '../Component/Navbar';
import { invoke } from '@tauri-apps/api';
const Subjectmanagement = () => {
  const [subjects, setSubjects] = useState([]);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  async function fetchSubjects() {
    const subjects = await invoke('getsubjects', {});
    setSubjects(subjects);
    setFilteredSubjects(subjects); 
  }
  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    const filtered = subjects.filter(subject =>
      subject.subject_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.subject_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredSubjects(filtered);
  }, [searchQuery, subjects]);
  return (
    <>
      <Navbar />
      <div className="flex">
        <div className="w-10/12 border-r border-gray-300 pr-7 pl-6">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr>
                <th className="border border-gray-200 px-4 py-2">Subject Code</th>
                <th className="border border-gray-200 px-4 py-2">Subject Name</th>
              </tr>
            </thead>
            <tbody>
            {filteredSubjects.map(subject => (
                <tr key={subject.index}>
                  <td className="border border-gray-200 px-4 py-2">{subject.subject_code}</td>
                  <td className="border border-gray-200 px-4 py-2">{subject.subject_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ml-8 ">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded-l px-4 py-2 focus:outline-none"
          />
        </div>
      </div>
    </>
  );
};
export default Subjectmanagement