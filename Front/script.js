// --- CONFIGURATION ---
const API_BASE = "http://localhost:5000"; // Base URL for the Flask backend

// Helper function to show a custom message instead of alert
function showMessage(message, type = 'success') {
    const msgBox = document.createElement('div');
    msgBox.textContent = message;
    msgBox.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        color: white;
        z-index: 1000;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        background-color: ${type === 'success' ? '#28a745' : '#dc3545'};
        transition: opacity 0.5s ease-in-out;
    `;
    document.body.appendChild(msgBox);
    setTimeout(() => {
        msgBox.style.opacity = '0';
        setTimeout(() => msgBox.remove(), 500);
    }, 3000);
}


// ---------------- LOGIN ----------------
if (document.getElementById("loginForm")) {
    document.getElementById("loginForm").addEventListener("submit", function(e) {
        e.preventDefault();

        const userId = document.getElementById("userId").value;
        const password = document.getElementById("password").value;
        const role = document.getElementById("role").value;

        fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, password, role })
        })
        .then(r => r.json())
        .then(d => {
            if (d.status === "success") {
                // Store user role and ID (optional, but good practice for dashboard personalization)
                sessionStorage.setItem('userRole', d.role);
                sessionStorage.setItem('userId', userId);
                window.location.href = "dashboard.html";
            } else {
                document.getElementById("error-msg").textContent = "Invalid Login! Please check User ID, Password, and Role.";
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            document.getElementById("error-msg").textContent = "Login failed. Could not connect to the server.";
        });
    });
}


// ---------------- LOGOUT ----------------
if (document.getElementById("logout")) {
    document.getElementById("logout").addEventListener("click", () => {
        sessionStorage.clear(); // Clear session data on logout
        window.location.href = "index.html";
    });
}


// ---------------- DASHBOARD STATS ----------------
if (document.querySelector('.cards')) {
    const welcomeMsg = document.getElementById('welcome-msg');
    const userId = sessionStorage.getItem('userId') || 'User';
    welcomeMsg.textContent = `Hello, ${userId}!`;

    fetch(`${API_BASE}/dashboard_stats`)
        .then(r => r.json())
        .then(stats => {
            // Update the card content (assuming the card structure)
            document.querySelector('.card:nth-child(1) p').textContent = stats.total_patients;
            document.querySelector('.card:nth-child(2) p').textContent = stats.appointments_today;
        })
        .catch(error => console.error('Error fetching dashboard stats:', error));
}


// ---------------- ADD PATIENT ----------------
if (document.getElementById("patientForm")) {
    document.getElementById("patientForm").addEventListener("submit", e => {
        e.preventDefault();

        let data = {
            name: document.getElementById("pname").value,
            age: document.getElementById("age").value,
            gender: document.getElementById("gender").value,
            contact: document.getElementById("contact").value,
            address: document.getElementById("address").value,
            disease: document.getElementById("disease").value
        };

        fetch(`${API_BASE}/add_patient`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
        .then(r => {
            if (r.ok) {
                document.getElementById("patientForm").reset();
                showMessage("Patient added successfully!");
            } else {
                showMessage("Failed to add patient.", 'error');
            }
        })
        .catch(error => {
            console.error('Error adding patient:', error);
            showMessage("Server error: Could not add patient.", 'error');
        });
    });
}


// ---------------- LOAD PATIENTS ----------------
if (document.getElementById("patientTable")) {
    const patientTableBody = document.getElementById("patientTable");

    function loadPatients() {
        fetch(`${API_BASE}/patients`)
            .then(r => r.json())
            .then(patients => {
                patientTableBody.innerHTML = "";

                patients.forEach(p => {
                    patientTableBody.innerHTML += `
                        <tr>
                            <td>${p.id}</td>
                            <td>${p.name}</td>
                            <td>${p.age}</td>
                            <td>${p.gender}</td>
                            <td>${p.contact}</td>
                            <td>
                                <button class="view-btn" onclick="viewPatient(${p.id})">View</button>
                                <button class="delete-btn" onclick="deletePatient(${p.id})">Delete</button>
                            </td>
                        </tr>
                    `;
                });
            })
            .catch(error => {
                console.error('Error fetching patients:', error);
                patientTableBody.innerHTML = '<tr><td colspan="6">Error loading patient data.</td></tr>';
            });
    }
    
    // Initial load
    loadPatients();
}

function viewPatient(id) {
    // Save the patient ID in sessionStorage and navigate to the details page
    sessionStorage.setItem('currentPatientId', id);
    window.location.href = "patient_details.html";
}

function deletePatient(id) {
    if (confirm(`Are you sure you want to delete Patient ID ${id}? This will also remove all their history and appointments.`)) {
        fetch(`${API_BASE}/delete_patient/${id}`, { method: "DELETE" })
            .then(r => r.json())
            .then(d => {
                if (d.status === "success") {
                    showMessage(d.message);
                    loadPatients(); // Reload the patient list
                } else {
                    showMessage(d.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error deleting patient:', error);
                showMessage("Server error: Could not delete patient.", 'error');
            });
    }
}

// ---------------- LOAD PATIENT DETAILS (patient_details.html) ----------------
if (document.querySelector('.patient-info')) {
    const patientId = sessionStorage.getItem('currentPatientId');
    const patientInfoDiv = document.querySelector('.patient-info');
    const patientHistoryTableBody = document.getElementById('historyTable');
    
    if (!patientId) {
        patientInfoDiv.innerHTML = '<p>No patient ID selected. Please go back to All Patients.</p>';
        document.querySelector('.medical-record-form-section').style.display = 'none';
    } else {
        
        // 1. Fetch main patient details
        fetch(`${API_BASE}/patient_details/${patientId}`)
            .then(r => r.json())
            .then(p => {
                if (p.status === 'error') {
                    patientInfoDiv.innerHTML = `<p>${p.message}</p>`;
                    return;
                }
                document.querySelector('h1').textContent = `Patient Details - ${p.name}`;
                document.querySelector('h2').textContent = 'Patient Information';
                patientInfoDiv.innerHTML = `
                    <p><strong>ID:</strong> ${p.id}</p>
                    <p><strong>Full Name:</strong> ${p.name}</p>
                    <p><strong>Age:</strong> ${p.age}</p>
                    <p><strong>Gender:</strong> ${p.gender}</p>
                    <p><strong>Contact:</strong> ${p.contact}</p>
                    <p><strong>Address:</strong> ${p.address}</p>
                    <p><strong>Disease/Problem:</strong> ${p.disease}</p>
                `;
                // Store patient name for medical record form use
                document.getElementById('patientIdInput').value = p.id; 
            })
            .catch(error => {
                console.error('Error fetching patient details:', error);
                patientInfoDiv.innerHTML = '<p>Error loading patient details.</p>';
            });

        // 2. Fetch medical history
        function loadMedicalHistory() {
            fetch(`${API_BASE}/patient_history/${patientId}`)
                .then(r => r.json())
                .then(history => {
                    patientHistoryTableBody.innerHTML = "";
                    if (history.length === 0) {
                         patientHistoryTableBody.innerHTML = '<tr><td colspan="4">No medical history found.</td></tr>';
                    }
                    history.forEach(h => {
                        patientHistoryTableBody.innerHTML += `
                            <tr>
                                <td>${h.date}</td>
                                <td>${h.doctor}</td>
                                <td>${h.diagnosis}</td>
                                <td>${h.prescription || 'N/A'}</td>
                            </tr>
                        `;
                    });
                })
                .catch(error => {
                    console.error('Error fetching medical history:', error);
                    patientHistoryTableBody.innerHTML = '<tr><td colspan="4">Error loading medical history.</td></tr>';
                });
        }
        
        loadMedicalHistory();
        
        // 3. Handle Add Medical Record Form
        const addHistoryForm = document.getElementById('addHistoryForm');
        if (addHistoryForm) {
            addHistoryForm.addEventListener('submit', e => {
                e.preventDefault();
                
                const data = {
                    patient_id: patientId,
                    date: document.getElementById('histDate').value,
                    doctor: document.getElementById('histDoctor').value,
                    diagnosis: document.getElementById('histDiagnosis').value,
                    prescription: document.getElementById('histPrescription').value
                };
                
                fetch(`${API_BASE}/add_medical_record`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                })
                .then(r => {
                    if (r.ok) {
                        showMessage("Medical record added successfully!");
                        addHistoryForm.reset();
                        loadMedicalHistory(); // Reload history table
                    } else {
                         showMessage("Failed to add medical record.", 'error');
                    }
                })
                .catch(error => {
                    console.error('Error adding medical record:', error);
                    showMessage("Server error: Could not add medical record.", 'error');
                });
            });
        }
    }
}


// ---------------- ADD APPOINTMENT (appointments.html form) ----------------
if (document.getElementById("appointmentForm")) {
    document.getElementById("appointmentForm").addEventListener("submit", e => {
        e.preventDefault();

        let data = {
            patient: document.getElementById("ap-patient").value,
            doctor: document.getElementById("ap-doctor").value,
            date: document.getElementById("ap-date").value,
            time: document.getElementById("ap-time").value
        };

        fetch(`${API_BASE}/add_appointment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
        .then(r => {
             if (r.ok) {
                document.getElementById("appointmentForm").reset();
                showMessage("Appointment added successfully!");
                loadAppointments(); // Reload the table
            } else {
                showMessage("Failed to add appointment.", 'error');
            }
        })
        .catch(error => {
            console.error('Error adding appointment:', error);
            showMessage("Server error: Could not add appointment.", 'error');
        });
    });
}


// ---------------- LOAD APPOINTMENTS ----------------
let loadAppointments = () => {}; // Define a global function reference

if (document.getElementById("appointmentTable")) {
    const appointmentTableBody = document.getElementById("appointmentTable");

    loadAppointments = function() {
        fetch(`${API_BASE}/appointments`)
            .then(r => r.json())
            .then(rows => {
                appointmentTableBody.innerHTML = "";

                rows.forEach(a => {
                    appointmentTableBody.innerHTML += `
                        <tr>
                            <td>${a.id}</td>
                            <td>${a.patient_name}</td>
                            <td>${a.doctor}</td>
                            <td>${a.date}</td>
                            <td>${a.time}</td>
                            <td>
                                <button class="delete-btn" onclick="delAp(${a.id})">Delete</button>
                            </td>
                        </tr>
                    `;
                });
            })
            .catch(error => {
                console.error('Error fetching appointments:', error);
                appointmentTableBody.innerHTML = '<tr><td colspan="6">Error loading appointment data.</td></tr>';
            });
    };
    
    // Initial load
    loadAppointments();
}

function delAp(id) {
    if (confirm(`Are you sure you want to delete Appointment ID ${id}?`)) {
        fetch(`${API_BASE}/delete_appointment/${id}`, { method: "DELETE" })
            .then(r => r.json())
            .then(d => {
                if (d.status === "success") {
                    showMessage(d.message);
                    loadAppointments(); // Reload the appointment list
                } else {
                    showMessage(d.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error deleting appointment:', error);
                showMessage("Server error: Could not delete appointment.", 'error');
            });
    }
}