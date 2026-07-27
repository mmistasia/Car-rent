const ADMIN_EMAIL = "admin.fleet@skywaystechnics.com";

// Application Data Store with Default History Logs for Testing
const defaultState = {
  selectedVehicleId: "WXX 8899",
  isAdminLoggedIn: false,
  vehicles: {
    "WXX 8899": {
      regNum: "WXX 8899",
      model: "Toyota Innova 2.0 (7-Seater)",
      status: "Available",
      nextServiceDate: "2026-10-15",
      currentMileage: 45210,
      previousUser: "John Doe",
      upcomingTrips: []
    },
    "VBB 1234": {
      regNum: "VBB 1234",
      model: "Nissan Serena S-Hybrid",
      status: "Available",
      nextServiceDate: "2026-11-20",
      currentMileage: 28400,
      previousUser: "Michael Wong",
      upcomingTrips: []
    }
  },
  pendingRequests: [],
  usageLogs: [
    {
      timestamp: "2026-07-20 17:30:00",
      regNum: "WXX 8899",
      driverName: "John Doe (ST-1002)",
      finalMileage: "45210 km",
      condition: "Good Condition",
      notes: "Cleaned vehicle after Subang hangar visit"
    },
    {
      timestamp: "2026-07-15 14:15:00",
      regNum: "VBB 1234",
      driverName: "Michael Wong (ST-2041)",
      finalMileage: "28400 km",
      condition: "Good Condition",
      notes: "Refueled to full tank"
    }
  ]
};

let state = JSON.parse(localStorage.getItem('skyways_fleet_data')) || defaultState;

let currentBookingData = {
  driverPhoto: null,
  odometerPhoto: null,
  passengers: []
};

function saveData() {
  localStorage.setItem('skyways_fleet_data', JSON.stringify(state));
}

// Hide Splash Screen on Startup
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('splash-screen').classList.add('hidden');
  }, 1800);
  refreshUI();
});

function changeVehicle(regNum) {
  state.selectedVehicleId = regNum;
  refreshUI();
}

function getActiveVehicle() {
  return state.vehicles[state.selectedVehicleId];
}

function refreshUI() {
  const activeCar = getActiveVehicle();

  const dropdown = document.getElementById('vehicle-dropdown');
  dropdown.innerHTML = '';
  Object.keys(state.vehicles).forEach(reg => {
    const opt = document.createElement('option');
    opt.value = reg;
    opt.innerText = `${reg} - ${state.vehicles[reg].model}`;
    if (reg === state.selectedVehicleId) opt.selected = true;
    dropdown.appendChild(opt);
  });

  document.getElementById('disp-model-name').innerText = activeCar.model;
  
  const badge = document.getElementById('disp-status-badge');
  badge.innerText = activeCar.status;
  badge.className = `status-badge ${
    activeCar.status === 'Available' ? 'available' : 
    activeCar.status === 'Pending Approval' ? 'pending' : 'booked'
  }`;

  document.getElementById('disp-service-date').innerText = activeCar.nextServiceDate;
  document.getElementById('disp-mileage').innerText = `${activeCar.currentMileage.toLocaleString()} km`;
  document.getElementById('disp-prev-user').innerText = activeCar.previousUser;
  
  const tripsContainer = document.getElementById('upcoming-trips-container');
  tripsContainer.innerHTML = '';
  if (activeCar.upcomingTrips.length === 0) {
    tripsContainer.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted);">No upcoming reservations found.</p>`;
  } else {
    activeCar.upcomingTrips.forEach(trip => {
      const item = document.createElement('div');
      item.className = 'trip-item';
      item.innerHTML = `
        <div style="font-weight:700; color:var(--primary);">📅 ${trip.startDate} to ${trip.endDate}</div>
        <div><b>Driver:</b> ${trip.driverName}</div>
        <div style="color:var(--text-muted); font-size:0.8rem;">Destination: ${trip.destination}</div>
      `;
      tripsContainer.appendChild(item);
    });
  }

  saveData();
}

function handleFileUpload(event, type) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      if (type === 'license') {
        document.getElementById('license-preview').src = e.target.result;
        document.getElementById('license-preview').style.display = 'block';
        document.getElementById('license-placeholder').style.display = 'none';
        currentBookingData.driverPhoto = e.target.result;
      } else if (type === 'odometer') {
        document.getElementById('odometer-preview').src = e.target.result;
        document.getElementById('odometer-preview').style.display = 'block';
        document.getElementById('odometer-placeholder').style.display = 'none';
        currentBookingData.odometerPhoto = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  }
}

function openBookingModal() {
  const car = getActiveVehicle();
  document.getElementById('book-selected-car').value = `${car.regNum} (${car.model})`;
  goToStep1();
  document.getElementById('booking-modal').classList.add('active');
}

function goToStep1() {
  document.getElementById('booking-step-1').style.display = 'block';
  document.getElementById('booking-step-2').style.display = 'none';
  document.getElementById('step-dot-1').classList.add('active');
  document.getElementById('step-dot-2').classList.remove('active');
}

function goToStep2() {
  const startDate = document.getElementById('book-start-date').value;
  const endDate = document.getElementById('book-end-date').value;
  const dest = document.getElementById('book-destination').value;
  const driverName = document.getElementById('driver-name').value;
  const staffId = document.getElementById('driver-staff-id').value;
  const email = document.getElementById('driver-email').value;
  const driverId = document.getElementById('driver-id').value;

  if (!startDate || !endDate || !dest || !driverName || !staffId || !email || !driverId || !currentBookingData.driverPhoto) {
    alert("Please complete all booking and driver fields (including License photo).");
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    alert("Start Date cannot be after End Date.");
    return;
  }

  const car = getActiveVehicle();
  const reqStart = new Date(startDate);
  const reqEnd = new Date(endDate);
  const hasCollision = car.upcomingTrips.some(trip => {
    const tripStart = new Date(trip.startDate);
    const tripEnd = new Date(trip.endDate);
    return (reqStart <= tripEnd && reqEnd >= tripStart);
  });

  if (hasCollision) {
    alert(`❌ RESERVATION CONFLICT!\n\n${car.regNum} is already booked during these dates.`);
    return;
  }

  document.getElementById('booking-step-1').style.display = 'none';
  document.getElementById('booking-step-2').style.display = 'block';
  document.getElementById('step-dot-1').classList.remove('active');
  document.getElementById('step-dot-2').classList.add('active');
}

function addPassenger() {
  const name = document.getElementById('pass-name').value;
  const idNum = document.getElementById('pass-id').value;
  if (!name || !idNum) return;

  if (currentBookingData.passengers.length >= 6) {
    alert("Maximum 6 passengers allowed.");
    return;
  }

  currentBookingData.passengers.push({ name, idNum });
  
  const tagContainer = document.getElementById('passenger-tags-container');
  const tag = document.createElement('span');
  tag.className = 'pass-tag';
  tag.innerHTML = `👤 ${name} (${idNum})`;
  tagContainer.appendChild(tag);

  document.getElementById('pass-count').innerText = currentBookingData.passengers.length;
  document.getElementById('pass-name').value = '';
  document.getElementById('pass-id').value = '';
}

function submitBookingAndRequest() {
  const car = getActiveVehicle();

  const requestObj = {
    id: Date.now(),
    vehicleReg: car.regNum,
    vehicleModel: car.model,
    startDate: document.getElementById('book-start-date').value,
    endDate: document.getElementById('book-end-date').value,
    destination: document.getElementById('book-destination').value,
    driverName: document.getElementById('driver-name').value,
    staffId: document.getElementById('driver-staff-id').value,
    email: document.getElementById('driver-email').value,
    driverId: document.getElementById('driver-id').value,
    licensePhoto: currentBookingData.driverPhoto,
    passengers: [...currentBookingData.passengers],
    requestTime: new Date().toLocaleString()
  };

  state.pendingRequests.push(requestObj);
  car.status = "Pending Approval";

  alert(`✅ Reservation request submitted for ${car.regNum}!\n\nPending Admin approval.`);
  closeModal('booking-modal');
  resetBookingForm();
  refreshUI();
}

function resetBookingForm() {
  document.getElementById('book-start-date').value = '';
  document.getElementById('book-end-date').value = '';
  document.getElementById('book-destination').value = '';
  document.getElementById('driver-name').value = '';
  document.getElementById('driver-staff-id').value = '';
  document.getElementById('driver-email').value = '';
  document.getElementById('driver-id').value = '';
  document.getElementById('license-preview').style.display = 'none';
  document.getElementById('license-placeholder').style.display = 'block';
  document.getElementById('passenger-tags-container').innerHTML = '';
  document.getElementById('pass-count').innerText = '0';
  currentBookingData = { driverPhoto: null, odometerPhoto: null, passengers: [] };
}

function openReturnModal() {
  const car = getActiveVehicle();
  document.getElementById('return-selected-car').value = `${car.regNum} (${car.model})`;
  document.getElementById('return-start-mileage').innerText = `${car.currentMileage.toLocaleString()} km`;
  document.getElementById('return-modal').classList.add('active');
}

function toggleDefectNotes(val) {
  document.getElementById('defect-notes-group').style.display = (val !== 'Good Condition') ? 'block' : 'none';
}

function submitVehicleReturn() {
  const car = getActiveVehicle();
  const newMileage = parseInt(document.getElementById('return-mileage-input').value, 10);
  const condition = document.getElementById('return-condition').value;
  const notes = document.getElementById('return-defect-notes').value || 'None';

  if (isNaN(newMileage) || newMileage < car.currentMileage) {
    alert(`Please enter a valid odometer reading (>= ${car.currentMileage} km).`);
    return;
  }

  if (!currentBookingData.odometerPhoto) {
    alert("⚠️ Please upload a clear photo of the dashboard odometer.");
    return;
  }

  car.currentMileage = newMileage;
  car.status = "Available";

  state.usageLogs.unshift({
    timestamp: new Date().toLocaleString(),
    regNum: car.regNum,
    driverName: car.previousUser,
    finalMileage: `${newMileage} km`,
    condition: condition,
    notes: notes
  });

  alert(`Vehicle ${car.regNum} returned successfully!`);
  closeModal('return-modal');
  
  document.getElementById('return-mileage-input').value = '';
  document.getElementById('odometer-preview').style.display = 'none';
  document.getElementById('odometer-placeholder').style.display = 'block';
  currentBookingData.odometerPhoto = null;

  refreshUI();
}

function openAdminPortal() {
  if (!state.isAdminLoggedIn) {
    document.getElementById('admin-login-modal').classList.add('active');
  } else {
    renderAdminDashboard();
    document.getElementById('admin-panel-modal').classList.add('active');
  }
}

function processAdminLogin() {
  const user = document.getElementById('admin-user-input').value;
  const pass = document.getElementById('admin-pass-input').value;

  if (user === "admin" && pass === "skyways123") {
    state.isAdminLoggedIn = true;
    closeModal('admin-login-modal');
    renderAdminDashboard();
    document.getElementById('admin-panel-modal').classList.add('active');
  } else {
    alert("Invalid login credentials.");
  }
}

function logoutAdmin() {
  state.isAdminLoggedIn = false;
  closeModal('admin-panel-modal');
  refreshUI();
}

function renderAdminDashboard() {
  const reqContainer = document.getElementById('pending-requests-container');
  reqContainer.innerHTML = state.pendingRequests.length === 0 ? `<p style="font-size:0.8rem; color:var(--text-muted);">No pending requests.</p>` : '';

  state.pendingRequests.forEach(req => {
    const card = document.createElement('div');
    card.style.cssText = "background:#FFFBEB; border:1px solid #F59E0B; padding:10px; border-radius:8px; margin-bottom:8px; font-size:0.8rem;";
    card.innerHTML = `
      <div style="font-weight:bold; color:var(--primary);">${req.vehicleReg} - ${req.driverName}</div>
      <div>Dates: ${req.startDate} to ${req.endDate}</div>
      <div>Purpose: ${req.destination}</div>
      <div style="display:flex; gap:6px; margin-top:8px;">
        <button class="btn btn-success" style="padding:4px 8px; font-size:0.75rem;" onclick="approveRequest(${req.id})">Approve</button>
        <button class="btn btn-danger" style="padding:4px 8px; font-size:0.75rem;" onclick="rejectRequest(${req.id})">Reject</button>
      </div>
    `;
    reqContainer.appendChild(card);
  });

  const logContainer = document.getElementById('usage-log-container');
  logContainer.innerHTML = state.usageLogs.length === 0 ? `<p style="font-size:0.8rem; color:var(--text-muted);">No logs available.</p>` : '';
  state.usageLogs.forEach(log => {
    const item = document.createElement('div');
    item.style.cssText = "background:#F8FAFC; border:1px solid #E2E8F0; padding:8px; border-radius:6px; margin-bottom:6px; font-size:0.75rem;";
    item.innerHTML = `
      <div><b>${log.regNum}</b> - ${log.driverName} (${log.timestamp})</div>
      <div>Odometer: ${log.finalMileage} | Condition: ${log.condition}</div>
    `;
    logContainer.appendChild(item);
  });
}

function approveRequest(reqId) {
  const req = state.pendingRequests.find(r => r.id === reqId);
  if (req) {
    const car = state.vehicles[req.vehicleReg];
    car.status = "Booked";
    car.previousUser = `${req.driverName} (${req.staffId})`;
    car.upcomingTrips.push({
      id: req.id,
      startDate: req.startDate,
      endDate: req.endDate,
      destination: req.destination,
      driverName: req.driverName
    });

    state.pendingRequests = state.pendingRequests.filter(r => r.id !== reqId);
    renderAdminDashboard();
    refreshUI();
  }
}

function rejectRequest(reqId) {
  const req = state.pendingRequests.find(r => r.id === reqId);
  if (req) {
    state.vehicles[req.vehicleReg].status = "Available";
    state.pendingRequests = state.pendingRequests.filter(r => r.id !== reqId);
    renderAdminDashboard();
    refreshUI();
  }
}

function exportToCSV() {
  if (state.usageLogs.length === 0) {
    alert("No history logs available to export.");
    return;
  }

  let csvContent = "\uFEFF";
  csvContent += "Timestamp,Vehicle Reg,Driver Name,Final Mileage,Condition,Notes\n";

  state.usageLogs.forEach(row => {
    const driver = (row.driverName || 'N/A').replace(/"/g, '""');
    const condition = (row.condition || 'N/A').replace(/"/g, '""');
    const notes = (row.notes || 'N/A').replace(/"/g, '""');
    
    csvContent += `"${row.timestamp}","${row.regNum}","${driver}","${row.finalMileage}","${condition}","${notes}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  link.setAttribute("href", url);
  link.setAttribute("download", `Skyways_Fleet_Usage_Log_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}