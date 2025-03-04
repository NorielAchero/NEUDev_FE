const API_LINK = import.meta.env.VITE_API_URL;
// Base API URL for backend

console.log("🔍 API_URL:", API_LINK);

//////////////////////////////////////////
// LOGIN/SIGNUP/LOGOUT FUNCTIONS
//////////////////////////////////////////

// Function to register a user (student or teacher)
async function register(firstname, lastname, email, student_num, program, password) {
    try {
        let endpoint = `${API_LINK}/register/teacher`; // Default to teacher registration
        let payload = { firstname, lastname, email, password }; // Ensure password is always included

        // If student fields are provided, switch to student registration
        if (student_num && program) {
            endpoint = `${API_LINK}/register/student`;
            payload.student_num = student_num;
            payload.program = program;
        }

        const response = await fetch(endpoint, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: data.message || "Registration failed", details: data.errors || {} };
        }

        return data;
    } catch (error) {
        console.error("❌ Registration Error:", error.message);
        return { error: "Something went wrong during registration." };
    }
}

// Function to log in a user
async function login(email, password) {
    try {
        const response = await fetch(`${API_LINK}/login`, {
            method: "POST",
            body: JSON.stringify({ email, password }),
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json();
        console.log("API Response:", data); // Debugging output

        if (!response.ok) {
            return { error: data.message || "Login failed" };
        }

        // Extract and store authentication details
        sessionStorage.setItem("access_token", data.access_token);
        sessionStorage.setItem("user_email", email);
        sessionStorage.setItem("user_type", data.user_type);

        // Store the correct ID based on userType
        if (data.user_type === "student" && data.studentID) {
            sessionStorage.setItem("userID", data.studentID);
        } else if (data.user_type === "teacher" && data.teacherID) {
            sessionStorage.setItem("userID", data.teacherID);
        }

        return data;
    } catch (error) {
        console.error("Login Error:", error.message);
        return { error: "Something went wrong during login." };
    }
}

// Function to log out a user
async function logout() {
    const token = sessionStorage.getItem("access_token");

    if (!token) return { error: "No user is logged in." };

    const response = await fetch(`${API_LINK}/logout`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });

    if (response.ok) {
        sessionStorage.clear();
        localStorage.clear();
        return { message: "Logout successful" };
    }

    return { error: "Logout failed. Try again." };
}

// Function to verify password
async function verifyPassword(email, password) {
    try {
      const response = await fetch(`${API_LINK}/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" }
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        // If the response is not OK, it means password is incorrect
        return { error: data.message || "Wrong password" };
      }
  
      // We do NOT store the token in session storage here. 
      // We only want to verify the password correctness.
      return { success: true };
    } catch (error) {
      console.error("❌ verifyPassword Error:", error);
      return { error: "Something went wrong while verifying the password." };
    }
  }

// Function to check if user is logged in
function hasAccessToken() {
    return sessionStorage.getItem("access_token") !== null;
}

// Function to get user info (used for determining role)
async function getUserInfo() {
    const token = sessionStorage.getItem("access_token");

    if (!token) return { error: "Unauthorized access: No token found" };

    const data = await safeFetch(`${API_LINK}/user`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });

    console.log("🔍 User Info Response:", data); // Debugging

    if (!data.error) {
        sessionStorage.setItem("user_type", data.user_type);

        // Store correct user ID
        if (data.user_type === "student" && data.studentID) {
            sessionStorage.setItem("userID", data.studentID);
        } else if (data.user_type === "teacher" && data.teacherID) {
            sessionStorage.setItem("userID", data.teacherID);
        } else {
            return { error: "User data is incomplete" };
        }
    }

    return data;
}


// Function to get the stored user role
function getUserRole() {
    return sessionStorage.getItem("user_type") || null;
}

//////////////////////////////////////////
// PROFILE PAGE FUNCTIONS
//////////////////////////////////////////

async function getProfile() {
    const token = sessionStorage.getItem("access_token");
    const role = sessionStorage.getItem("user_type");
    const userID = sessionStorage.getItem("userID");

    if (!token || !role || !userID) {
        return { error: "Unauthorized access: Missing credentials" };
    }

    const endpoint = role === "student" ? `student/profile/${userID}` : `teacher/profile/${userID}`;

    const response = await safeFetch(`${API_LINK}/${endpoint}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.error) {
        // console.log("🟢 API Response (Profile):", response);
        
        // ✅ Store instructor's name for later use
        const instructorName = `${response.firstname} ${response.lastname}`;
        sessionStorage.setItem("instructor_name", instructorName);
    }

    return response;
}

// Function to update the user's profile (Student or Teacher)
async function updateProfile(profileData) {
    const token = sessionStorage.getItem("access_token");
    const role = sessionStorage.getItem("user_type");
    const userID = sessionStorage.getItem("userID");
  
    if (!token || !role || !userID) return { error: "Unauthorized access" };
  
    // Determine endpoint based on user type
    const endpoint = role === "student" ? `student/profile/${userID}` : `teacher/profile/${userID}`;
  
    // Build FormData from profileData.
    // Make sure to include the _method override.
    const formData = new FormData();
    
    // Append the method override so PHP treats it as a PUT.
    formData.append("_method", "PUT");
  
    // Append text fields.
    Object.keys(profileData).forEach((key) => {
      if (key === "profileImage" || key === "coverImage") return; // Skip file fields for now.
      if (key === "newPassword") {
        // Map newPassword to password
        if (profileData.newPassword && profileData.newPassword.trim() !== "") {
          formData.append("password", profileData.newPassword);
        }
      } else {
        if (profileData[key] !== "" && profileData[key] !== null && profileData[key] !== undefined) {
          formData.append(key, profileData[key]);
        }
      }
    });
  
    // Append file fields if they exist and are File objects.
    if (profileData.profileImage && profileData.profileImage instanceof File) {
      formData.append("profileImage", profileData.profileImage);
    }
    if (profileData.coverImage && profileData.coverImage instanceof File) {
      formData.append("coverImage", profileData.coverImage);
    }
  
    try {
      const response = await fetch(`${API_LINK}/${endpoint}`, {
        // Use POST method since we include _method=PUT
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json" // Let the browser set the Content-Type automatically.
        },
        body: formData,
        credentials: "include"
      });
      const data = await response.json();
      return response.ok ? data : { error: data.message || "Request failed", details: data };
    } catch (error) {
      console.error("API Error:", error);
      return { error: "Something went wrong." };
    }
  }


// Function to delete a user's profile
async function deleteProfile() {
    const token = sessionStorage.getItem("access_token");
    const role = sessionStorage.getItem("user_type");
    const userID = sessionStorage.getItem("userID");

    if (!token || !role || !userID) return { error: "Unauthorized access" };

    const endpoint = role === "student" ? `student/profile/${userID}` : `teacher/profile/${userID}`;

    const response = await safeFetch(`${API_LINK}/${endpoint}`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });

    if (!response.error) {
        sessionStorage.clear(); // Clear session on deletion
        return { message: "Profile deleted successfully" };
    }

    return { error: "Failed to delete profile" };
}


// Your safeFetch helper might already be defined here.
async function safeFetch(url, options = {}) {
    try {
      const response = await fetch(url, options);
      if (response.status === 204) return { message: "Success" };
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) {
        return { error: data?.message || `Request failed with status ${response.status}`, details: data };
      }
      return data || { message: "Success" };
    } catch (error) {
      console.error("Network/API Error:", error);
      return { error: "Network error or invalid response." };
    }
  }

//////////////////////////////////////////
// CLASS FUNCTIONS (STUDENTS)
//////////////////////////////////////////

// 📌 Student Enrollment Function
async function enrollInClass(classID) {
    const token = sessionStorage.getItem("access_token");
    const studentID = sessionStorage.getItem("userID"); // Ensure studentID is stored

    if (!token || !studentID) return { error: "Unauthorized access: No token or student ID found" };

    return await safeFetch(`${API_LINK}/student/class/${classID}/enroll`, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ studentID })
    });
}

// 📌 Student Unenrollment Function
async function unenrollFromClass(classID) {
    const token = sessionStorage.getItem("access_token");
    const studentID = sessionStorage.getItem("userID");

    if (!token || !studentID) return { error: "Unauthorized access: No token or student ID found" };

    return await safeFetch(`${API_LINK}/class/${classID}/unenroll`, {
        method: "DELETE",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });
}


// 📌 Student Fetch Enrolled Classes Function
async function getStudentClasses() {
    const token = sessionStorage.getItem("access_token");
    const studentID = sessionStorage.getItem("userID");

    if (!token || !studentID) return { error: "Unauthorized access: No token or student ID found" };

    return await safeFetch(`${API_LINK}/student/classes`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    }).then(response => {
        if (!response.error) {
            return response.map(cls => ({
                classID: cls.classID,
                className: cls.className,
                classSection: cls.classSection,
                teacherName: cls.teacherName
            }));
        }
        return response;
    });
}


//////////////////////////////////////////
// CLASS FUNCTIONS (TEACHERS)
//////////////////////////////////////////

async function getClasses() {
    const token = sessionStorage.getItem("access_token");
    const teacherID = sessionStorage.getItem("userID"); // Get the logged-in teacher ID

    if (!token || !teacherID) return { error: "Unauthorized access: No token or teacher ID found" };

    return await safeFetch(`${API_LINK}/teacher/classes`, { 
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    }).then(response => {
        if (!response.error) {
            // Ensure only classes created by the logged-in teacher
            return response.filter(cls => cls.teacherID == teacherID);
        }
        return response;
    });
}


async function createClass(classData) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    if (!classData || !classData.className || !classData.classSection) {
        console.error("❌ Error: className or classSection is missing!");
        return { error: "Class name and section are required." };
    }

    console.log("📤 Sending Class Data to Backend:", JSON.stringify(classData, null, 2)); // ✅ Debugging output

    return await safeFetch(`${API_LINK}/teacher/class`, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            className: classData.className.trim(),
            classSection: classData.classSection.trim(), // ✅ Ensure this is sent
        })
    });
}


async function deleteClass(classID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/class/${classID}`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });
}


async function updateClass(classID, updatedData) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/class/${classID}`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            className: updatedData.className.trim(),
            classSection: updatedData.classSection.trim()
        })
    });
}

async function getClassInfo(classID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/class-info/${classID}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });
}
  

async function getClassStudents(classID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/class/${classID}/students`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

async function unenrollStudent(classID, studentID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/class/${classID}/unenroll/${studentID}`, {
        method: "DELETE",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });
}

//////////////////////////////////////////
// ACTIVITY FUNCTIONS
//////////////////////////////////////////

async function getStudentActivities() {
    const token = sessionStorage.getItem("access_token"); 
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/student/activities`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}


async function createActivity(activityData) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };
    
    return await safeFetch(`${API_LINK}/teacher/activities`, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(activityData)
    });
}

// ✅ Function to edit an activity
async function editActivity(actID, updatedData) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    try {
        const response = await fetch(`${API_LINK}/teacher/activities/${actID}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedData)
        });

        const data = await response.json();
        return response.ok ? data : { error: data.message || "Failed to update activity", details: data };
    } catch (error) {
        console.error("❌ API Error (Edit Activity):", error);
        return { error: "Something went wrong while updating the activity." };
    }
}

// ✅ Function to delete an activity
async function deleteActivity(actID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    try {
        const response = await fetch(`${API_LINK}/teacher/activities/${actID}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        return response.ok ? { message: "Activity deleted successfully" } : { error: data.message || "Failed to delete activity" };
    } catch (error) {
        console.error("❌ API Error (Delete Activity):", error);
        return { error: "Something went wrong while deleting the activity." };
    }
}

async function getClassActivities(classID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    const response = await safeFetch(`${API_LINK}/teacher/class/${classID}/activities`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });

    console.log("🟢 API Response from getClassActivities:", response); // ✅ Log API response

    return response;
}

/**
 * Fetch questions by itemTypeID, optionally including query parameters
 * such as scope=personal/global and teacherID=1, etc.
 *
 * Usage:
 *   getQuestions(1, { scope: "personal", teacherID: "1" })
 */
 async function getQuestions(itemTypeID, query = {}) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };
  
    // Construct the base URL
    let url = `${API_LINK}/teacher/questions/itemType/${itemTypeID}`;
  
    // Convert the query object to a query string, e.g. { scope: "personal", teacherID: "1" } -> ?scope=personal&teacherID=1
    const queryString = new URLSearchParams(query).toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  
    console.log("📥 Fetching questions from:", url);
  
    return await safeFetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
  }

// ✅ Fetch available item types dynamically
async function getItemTypes() {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/itemTypes`, { 
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

async function getActivityDetails(actID) {
    const token = sessionStorage.getItem("access_token"); 
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/activities/${actID}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

//////////////////////////////////////////
// ACTIVITY MANAGEMENT (STUDENT)
//////////////////////////////////////////

async function getActivityItemsByStudent(actID) {
    const token = sessionStorage.getItem("access_token"); 
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/student/activities/${actID}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}


async function getActivityLeaderboardByStudent(actID) {
    const token = sessionStorage.getItem("access_token"); 
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/student/activities/${actID}/leaderboard`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}


//////////////////////////////////////////
// ACTIVITY MANAGEMENT (TEACHERS)
//////////////////////////////////////////

async function getActivityItemsByTeacher(actID) {
    const token = sessionStorage.getItem("access_token"); // Get stored auth token
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/activities/${actID}/items`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}


async function getActivityLeaderboardByTeacher(actID) {
    const token = sessionStorage.getItem("access_token"); 
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/activities/${actID}/leaderboard`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}


async function getActivitySettingsTeacher(actID) {
    const token = sessionStorage.getItem("access_token"); 
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/activities/${actID}/settings`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}


async function updateActivitySettingsTeacher(actID, settings) {
    const token = sessionStorage.getItem("access_token"); 
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/activities/${actID}/settings`, {
        method: "PUT",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
    });
}

//////////////////////////////////////////
// QUESTION & TEST CASES MANAGEMENT
//////////////////////////////////////////

// ✅ Fetch all questions for a specific item type
async function getQuestionsByItemType(itemTypeID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/questions/itemType/${itemTypeID}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

// ✅ Fetch a specific question (with test cases)
async function getQuestionDetails(questionID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/questions/${questionID}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

// ✅ Create a new question (with test cases)
async function createQuestion(questionData) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/questions`, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(questionData)
    });
}

// ✅ Update an existing question (with test cases)
async function updateQuestion(questionID, questionData) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/questions/${questionID}`, {
        method: "PUT",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(questionData)
    });
}

// ✅ Delete a question (only if it's not linked to an activity)
async function deleteQuestion(questionID) {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/questions/${questionID}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

async function getProgrammingLanguages() {
    const token = sessionStorage.getItem("access_token");
    if (!token) return { error: "Unauthorized access: No token found" };

    return await safeFetch(`${API_LINK}/teacher/programmingLanguages`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
}

// Exporting functions for use in other files
export { 
    register, 
    login, 
    logout,
    verifyPassword,
    hasAccessToken, 
    getUserRole, 
    getProfile, 
    updateProfile, 
    deleteProfile, 
    getUserInfo,
    enrollInClass, 
    unenrollFromClass,
    getStudentClasses,
    getClasses, 
    createClass, 
    deleteClass,
    getStudentActivities,
    createActivity,
    editActivity,
    deleteActivity,
    getClassActivities, 
    getClassInfo,
    getQuestions,
    getItemTypes,
    getClassStudents,
    getActivityDetails,
    getActivityItemsByStudent, 
    getActivityLeaderboardByStudent, 
    getActivityItemsByTeacher, 
    getActivityLeaderboardByTeacher,
    getActivitySettingsTeacher, 
    updateActivitySettingsTeacher,
    getQuestionsByItemType,
    getQuestionDetails,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    getProgrammingLanguages,
    updateClass,
    unenrollStudent
};
