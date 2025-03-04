import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom"; 
import { getClassStudents, getClassInfo, unenrollStudent, verifyPassword } from "../api/API";
import "../../style/teacher/leaderboard.css";
import TeacherAMNavigationBarComponent from "./TeacherCMNavigationBarComponent";
import { Modal, Button, Form } from "react-bootstrap"; // Bootstrap components

const LeaderboardItem = ({ index, name, studentNumber, score, avatarUrl, onUnenrollClick }) => {
  return (
    <tr>
      <td>{index}</td> {/* Numbering Column */}
      <td>
        <div className="avatar-name">
          <div className="avatar">
            <img
              src={avatarUrl || "/src/assets/avatar.png"}
              alt="Avatar"
              className="avatar-image"
            />
          </div>
          <span className="student-name">{name}</span>
        </div>
      </td>
      <td>{studentNumber}</td>
      <td>
        <div className="score-circle">{score}%</div>
      </td>
      <td className="unenroll-cell">
        <Button variant="danger" size="sm" onClick={onUnenrollClick}>
          Unenroll
        </Button>
      </td>
    </tr>
  );
};

const ClassRecord = () => {
  const { classID } = useParams(); 
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUnenrollModal, setShowUnenrollModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [sortCriteria, setSortCriteria] = useState("lastname"); // Default sorting by last name
  const [sortOrder, setSortOrder] = useState("asc"); // Default order: ascending

  useEffect(() => {
    if (!classID) return;

    const fetchClassInfo = async () => {
      try {
        const classInfoResponse = await getClassInfo(classID);
        if (!classInfoResponse.error) {
          setClassName(classInfoResponse.className);
        } else {
          console.error("Error fetching class info:", classInfoResponse.error);
        }
      } catch (error) {
        console.error("API Fetch Error:", error);
      }
    };

    const fetchStudents = async () => {
      try {
        const response = await getClassStudents(classID);
        if (!response.error) {
          setStudents(response);
        } else {
          console.error("Error fetching students:", response.error);
        }
      } catch (error) {
        console.error("API Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClassInfo();
    fetchStudents();
  }, [classID]);

  const handleUnenrollClick = (student) => {
    setSelectedStudent(student);
    setShowUnenrollModal(true);
    setPassword("");
    setErrorMessage("");
  };

  const handleConfirmUnenroll = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    if (!password) {
      setErrorMessage("Please enter your password.");
      setIsProcessing(false);
      return;
    }

    try {
      const teacherEmail = sessionStorage.getItem("user_email");
      const verifyResponse = await verifyPassword(teacherEmail, password);

      if (verifyResponse.error) {
        setErrorMessage("Incorrect password. Please try again.");
        setIsProcessing(false);
        return;
      }

      const unenrollResponse = await unenrollStudent(classID, selectedStudent.studentID);

      if (unenrollResponse.error) {
        setErrorMessage(unenrollResponse.error);
        setIsProcessing(false);
        return;
      }

      setStudents(students.filter((student) => student.studentID !== selectedStudent.studentID));

      setShowUnenrollModal(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error("Unenroll Error:", error);
      setErrorMessage("An error occurred while unenrolling the student.");
    } finally {
      setIsProcessing(false);
    }
  };

  const sortStudents = (criteria) => {
    let sortedStudents = [...students];

    if (criteria === "lastname") {
      sortedStudents.sort((a, b) =>
        sortOrder === "asc"
          ? a.lastname.localeCompare(b.lastname)
          : b.lastname.localeCompare(a.lastname)
      );
    } else if (criteria === "averageScore") {
      sortedStudents.sort((a, b) =>
        sortOrder === "asc" ? a.averageScore - b.averageScore : b.averageScore - a.averageScore
      );
    }

    setStudents(sortedStudents);
    setSortCriteria(criteria);
    setSortOrder(sortOrder === "asc" ? "desc" : "asc"); // Toggle sorting order
  };

  return (
    <div className="leaderboard-body">
      <TeacherAMNavigationBarComponent />
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h1 className="leaderboard-title">Students in {className || "Loading..."}</h1>
          
          {/* Sorting Buttons */}
          <div className="sorting-buttons">
            <Button variant="primary" onClick={() => sortStudents("lastname")}>
              Sort by Last Name {sortCriteria === "lastname" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </Button>
            <Button variant="success" className="ms-2" onClick={() => sortStudents("averageScore")}>
              Sort by Score {sortCriteria === "averageScore" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </Button>
          </div>

          {loading ? (
            <p>Loading students...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="leaderboard-column-titles">#</th> {/* Numbering Column Header */}
                  <th className="leaderboard-column-titles">Student Name</th>
                  <th className="leaderboard-column-titles">Student Number</th>
                  <th className="leaderboard-column-titles">Average Score</th>
                  <th className="leaderboard-column-titles">Unenroll</th>
                </tr>
              </thead>
              <tbody className="leaderboard-students">
                {students.length > 0 ? (
                  students.map((student, index) => (
                    <LeaderboardItem
                      key={student.studentID}
                      index={index + 1}
                      name={`${student.lastname}, ${student.firstname}`}
                      studentNumber={student.studentNumber}
                      score={student.averageScore}
                      avatarUrl={student.profileImage}
                      onUnenrollClick={() => handleUnenrollClick(student)}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center" }}>
                      No students enrolled in this class.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassRecord;
