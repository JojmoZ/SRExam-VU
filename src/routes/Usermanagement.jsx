import React, { useEffect, useState } from 'react';
import Navbar from '../Component/Navbar';
import { invoke } from '@tauri-apps/api';
import Modaldetails from '../Component/modaldetails';

const Usermanagement = () => {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [modalPurpose, setModalPurpose] = useState('');
  const [modalVictims, setModalVictims] = useState('');
  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.nim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.initial.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (selectedRole) {
      setFilteredUsers(filtered.filter(user => user.role === selectedRole));
    } else {
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users, selectedRole]);

  async function fetchUsers() {
    const users = await invoke('getusers', {});
    setUsers(users);
    setFilteredUsers(users);
  }
  const openModal = (purpose,nim)=>{
    setModalPurpose(purpose);
    setShowModal(true);
    setModalVictims(nim);
  }
  const closeModal = () => {
    setShowModal(false);
};
  return (
    <>
      <Navbar />
      <div className="flex">
        <div className="w-10/12 border-r border-gray-300 pr-7 pl-6">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr>
                <th className="border border-gray-200 px-4 py-2">BN Number</th>
                <th className="border border-gray-200 px-4 py-2">Initial</th>
                <th className="border border-gray-200 px-4 py-2">NIM</th>
                <th className="border border-gray-200 px-4 py-2">Name</th>
                <th className="border border-gray-200 px-4 py-2">Major</th>
                <th className="border border-gray-200 px-4 py-2">Role</th>
                <th className="border border-gray-200 px-4 py-2">Edit Role</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.nim}>
                  <td className="border border-gray-200 px-4 py-2">{user.bn_number}</td>
                  <td className="border border-gray-200 px-4 py-2">{user.initial}</td>
                  <td className="border border-gray-200 px-4 py-2">{user.nim}</td>
                  <td className="border border-gray-200 px-4 py-2">{user.name}</td>
                  <td className="border border-gray-200 px-4 py-2">{user.major}</td>
                  <td className="border border-gray-200 px-4 py-2">{user.role}</td>
                  <td className="border border-gray-200 px-4 py-2">
                    <button onClick={() => openModal('role', user.nim)}>Edit Role</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {showModal && <Modaldetails purpose={modalPurpose} onClose={closeModal} student={modalVictims} />}
        </div>

        <div className="ml-8 ">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded-l px-4 py-2 focus:outline-none"
          />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="border bg-slate-600 border-gray-300 rounded-r px-4 py-2 focus:outline-none"
          >
            <option value="">Roles</option>
            <option value="Student">Student</option>
            <option value="Assistant">Assistant</option>
            <option value="Subject Development">Subject Development</option>
            <option value="Exam Coordinator">Exam Coordinator</option>
          </select>
        </div>
      </div>
    </>
  );
};

export default Usermanagement;
