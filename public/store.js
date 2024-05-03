const visits = document.querySelector("#visits");
const studentList = document.getElementById('students');
const courseList = document.getElementById('courses');
const addVisitModal = document.getElementById('addVisit');
const modalForm = document.getElementById("modalForm");
const modalInfo = document.getElementById("modalInfo");
const modalCancel = document.getElementById("modalCancel");
const quarterList = document.getElementById("quarters");

const db = firebase.firestore();

// Reference to the "visit" collection
const visitCollection = db.collection("visit");
const quarterCollection = db.collection("quarter");

var currentQuarter;

function main() {
    // Find current quarter
    quarterCollection.where('owner', '==', globalUser.uid).orderBy("birthday", "desc").limit('1').get().then((snap) => {
        if (snap.docs.length) {
            currentQuarter = snap.docs[0];
            populatePage();
        } else {
            quarterCollection.add({ name: "Default quarter", birthday: firebase.firestore.FieldValue.serverTimestamp(), owner: globalUser.uid }).then((r) => {
                r.get().then((doc) => {
                    currentQuarter = doc;
                    populatePage();
                });
            });
        }
    });
}

function populatePage() {
    document.getElementById('quarterLabel').textContent = "Current quarter: " + currentQuarter.data().name;
    visits.innerHTML = `      <tr>
        <th>Name</th>
        <th>ID</th>
        <th>Course</th>
        <th>Professor</th>
        <th>Reason</th>
        <th>Time in</th>
        <th>Time out</th>
      </tr>
`
    // Populate table
    const students = new Set();
    const classes = new Set();
    visitCollection.where('owner', '==', globalUser.uid).where('quarter', '==', db.doc('quarter/' + currentQuarter.id))
        .orderBy('isDone').orderBy('timeIn', 'desc').get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                addVisit(doc)
                students.add(doc.data().student);
                classes.add(doc.data().className);
            });
            // Populate datalist of students
            studentList.innerHTML = "";
            for (const student of students.keys()) {
                studentList.innerHTML += `<option>${student}</option>`;
            }
            // Populate datalist of courses
            courseList.innerHTML = "";
            for (const course of classes.keys()) {
                courseList.innerHTML += `<option>${course}</option>`;
            }
        });

    // Populate datalist of quarters
    quarterList.innerHTML = "";
    quarterCollection.where('owner', '==', globalUser.uid).get().then((qS) => {
        qS.forEach((doc) => {
            quarterList.innerHTML += `<option>${doc.data().name}</option>`;
        });
    });
}

function makeData(str) {
    return "<td>" + str + "</td>";
}

function printTimestamp(ts) {
    if (!ts) {
        return "NULL";
    }
    // console.log(ts);
    date = new Date(ts.seconds * 1000);
    // console.log(date);
    str = ""
    str += date.getMonth() + 1;
    mins = date.getMinutes();
    mins = ("0" + mins).slice(-2);
    str += "/" + (date.getDate()) + "/" + (date.getYear() - 100) + " " + date.getHours() + ":" + mins;
    // console.log(str);
    return str;
}

function checkOutButton(id) {
    return `<button type="button" onclick="checkOut('${id}')">Check out</button>`
}

function editButton(id) {
    return `<button type="button" onclick="editVisit('${id}')">Edit</button>`
}

function deleteButton(id) {
    return `<button type="button" onclick="deleteVisit('${id}')">Delete</button>`
}

function checkOut(id) {
    const row = document.getElementById(id);
    const ref = visitCollection.doc(id);
    ref.update({ isDone: true, timeOut: firebase.firestore.FieldValue.serverTimestamp() }).then(() => {
        ref.get().then((doc) => {
            fillRow(row, doc.data(), doc);
        });
    });
}

function editVisit(id) {
    const row = document.getElementById(id);
    makeEditable(row, id);
}

function HTMLdateToFS(dateString) {
    if (dateString) {
        const JSdate = new Date(dateString);
        return firebase.firestore.Timestamp.fromDate(JSdate);
    } else {
        return null;
    }
}

function makeEditable(row, id) {
    const cells = row.getElementsByTagName('td');
    const newRow = document.createElement('tr');

    const names = ['name', 'id', 'className', 'prof', 'reason', 'timeIn', 'timeOut']
    for (let i = 0; i < names.length; i++) {
        const cell = cells[i];
        const currentValue = cell.textContent;
        const input = document.createElement('input');
        input.id = names[i] + id;
        if (i < 5) {
            input.type = 'text';
            input.value = currentValue;
        } else {
            input.type = 'datetime-local';
            if (currentValue != "Check out") {
                dateTime = currentValue.split(' ');
                date = dateTime[0];
                dateSplit = date.split('/');
                month = dateSplit[0];
                month = ("0" + month).slice(-2);
                day = dateSplit[1];
                day = ("0" + day).slice(-2);
                year = parseInt(dateSplit[2]) + 2000;
                time = dateTime[1];
                myVal = `${year}-${month}-${day}T${time}`;
                input.value = myVal;
            } else {
                input.value = null;
            }
        }
        const data = document.createElement('td');
        data.appendChild(input);
        newRow.appendChild(data);
        // cell.textContent = ''; // Clear the cell's current content
        // cell.appendChild(input);
    }
    let data = document.createElement('td');
    const submit = document.createElement('input');
    submit.type = 'submit';
    submit.value = 'Done';
    submit.onclick = (e) => {
        newRow.style.display = 'none';
        row.style.display = 'table-row';
        visitCollection.doc(id).update({
            isDone: !!document.getElementById('timeOut' + id).value,
            student: document.getElementById('name' + id).value,
            id: document.getElementById('id' + id).value,
            prof: document.getElementById('prof' + id).value,
            className: document.getElementById('className' + id).value,
            timeOut: HTMLdateToFS(document.getElementById('timeOut' + id).value),
            timeIn: HTMLdateToFS(document.getElementById('timeIn' + id).value),
            reason: document.getElementById('reason' + id).value,
        }).then(() => {
            newRow.remove();
            visitCollection.doc(id).get().then((doc) => {
                fillRow(row, doc.data(), doc);
            });
        })
    };
    data.appendChild(submit);
    newRow.appendChild(data);

    data = document.createElement("td");
    const markCurrent = document.createElement("button");
    markCurrent.type = "button";
    markCurrent.textContent = 'Mark as ongoing';
    markCurrent.onclick = (e) => {
        document.getElementById('timeOut' + id).value = null;
    };
    data.appendChild(markCurrent);
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = 'Cancel';
    cancel.onclick = (e) => {
        row.style.display = 'table-row';
        newRow.remove();
    };
    data.appendChild(cancel);
    newRow.appendChild(data);

    row.style.display = 'none';
    visits.insertBefore(newRow, row);
}

function deleteVisit(id) {
    confirm((bool) => {
        if (bool) {
            visitCollection.doc(id).delete().then((doc) => {
                document.getElementById(id).remove();
            });
        }
    }, "Are you sure you want to delete this visit?");
}

function fillRow(row, data, doc) {
    row.innerHTML = "";
    row.innerHTML += makeData(data.student);
    row.innerHTML += makeData(data.id);
    row.innerHTML += makeData(data.className);
    row.innerHTML += makeData(data.prof);
    row.innerHTML += makeData(data.reason);
    row.innerHTML += makeData(printTimestamp(data.timeIn));
    if (data.isDone) {
        row.innerHTML += makeData(printTimestamp(data.timeOut));
    } else {
        row.innerHTML += makeData(checkOutButton(doc.id));
    }
    row.innerHTML += makeData(editButton(doc.id));
    row.innerHTML += makeData(deleteButton(doc.id));
}

function addVisit(doc, top = false) {
    const data = doc.data();
    const row = document.createElement("tr");
    row.id = doc.id;
    fillRow(row, data, doc)
    if (top && visits.children.length >= 2) {
        visits.insertBefore(row, visits.children[1]);
    } else {
        visits.appendChild(row);
    }
}

const addStudentForm = document.getElementById("addStudent")
const addCourseForm = document.getElementById("addCourse");
const changeQuarterForm = document.getElementById("changeQuarter");

addStudentForm.addEventListener('submit', submitHandler);
addCourseForm.addEventListener('submit', courseHandler);
changeQuarterForm.addEventListener('submit', changeQuarter);

function submitHandler(e) {
    e.preventDefault();
    modalForm.reset();
    const studentName = addStudentForm.name.value;
    modalForm.modalName.value = studentName;
    modalInfo.innerHTML = '<button type="button" style="visibility: hidden;">autofill</button>';
    addVisitModal.showModal();
    modalForm.modalClass.focus();
    addStudentForm.reset();

    // get student's info
    const courses = new Set();
    visitCollection.where('owner', '==', globalUser.uid).where('quarter', '==', db.doc('quarter/' + currentQuarter.id))
        .where('student', '==', studentName).get().then((qS) => {
            qS.forEach((doc) => {
                data = doc.data();
                courses.add(data.className + ';' + data.prof);
                modalForm.modalID.value = data.id;
            });
            modalInfo.innerHTML = '';
            for (const courseStr of courses.keys()) {
                const course = courseStr.split(';');
                modalInfo.innerHTML += `<button type="button" onclick="modalCourse('${course[0]}', '${course[1]}')">${course[0]}/${course[1]}</button>`
            }
            fixModalButtons();
        });
}

function courseHandler(e) {
    e.preventDefault();
    modalForm.reset();
    const className = addCourseForm.name.value;
    modalForm.modalClass.value = className;
    modalInfo.innerHTML = '<button type="button" style="visibility: hidden;">autofill</button>';
    addVisitModal.showModal();
    modalForm.modalName.focus();
    addCourseForm.reset();

    // get course's info
    const students = new Set();
    visitCollection.where('owner', '==', globalUser.uid).where('quarter', '==', db.doc('quarter/' + currentQuarter.id))
        .where('className', '==', className).get().then((qS) => {
            qS.forEach((doc) => {
                data = doc.data();
                students.add(data.student + ';' + data.prof + ';' + data.id);
            });
            modalInfo.innerHTML = '';
            for (const courseStr of students.keys()) {
                course = courseStr.split(';');
                modalInfo.innerHTML += `<button type="button" onclick="modalStudent('${course[0]}', '${course[1]}', '${course[2]}')">${course[0]}/${course[1]}</button>`
            }
            fixModalButtons();
        });
}

function modalCourse(cname, prof) {
    modalForm.modalReason.focus();
    modalForm.modalClass.value = cname;
    modalForm.modalProf.value = prof;
}

function modalStudent(student, prof, id) {
    modalForm.modalReason.focus();
    modalForm.modalID.value = id;
    modalForm.modalName.value = student;
    modalForm.modalProf.value = prof;
}

function fixModalButtons() {
    modalForm.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
        });
        btn.type = "button"
    });
    modalCancel.addEventListener("click", (e) => {
        e.preventDefault();
        addVisitModal.close();
    });
}

modalForm.addEventListener('submit', addVisitFormSubmit);

function addVisitFormSubmit(e) {
    visitCollection.add({
        isDone: false, prof: modalForm.modalProf.value,
        className: modalForm.modalClass.value, reason: modalForm.modalReason.value,
        student: modalForm.modalName.value, timeIn: firebase.firestore.FieldValue.serverTimestamp(),
        id: modalForm.modalID.value,
        quarter: quarterCollection.doc(currentQuarter.id),
        owner: globalUser.uid
    }).then((doc) => {
        doc.get().then((doc) => {
            addVisit(doc, true);
        });
    });
}

function changeQuarter(e) {
    e.preventDefault();
    const myName = changeQuarterForm.name.value;
    changeQuarterForm.reset();
    quarterCollection.where('owner', '==', globalUser.uid).where('name', '==', myName).limit(1).get().then((snap) => {
        if (snap.docs.length) {
            currentQuarter = snap.docs[0];
            populatePage();
        } else {
            quarterCollection.add({ name: myName, birthday: firebase.firestore.FieldValue.serverTimestamp(), owner: globalUser.uid }).then((r) => {
                r.get().then((doc) => {
                    currentQuarter = doc;
                    populatePage();
                });
            });
        }
    });
}

function deleteQuarter(e) {
    confirm((bool) => {
        if (bool) {
            quarterCollection.doc(currentQuarter.id).delete().then(() => {
                main();
            });
        }
    }, "Are you sure you want to delete \"" + currentQuarter.data().name + "\"?");
}

function logOut(e) {
    firebase.auth().signOut();
}

var confirmed = false;
var confirmF = null;
function confirm(f, prompt) {
    confirmed = false;
    document.getElementById("confirmText").innerHTML = prompt;
    confirmF = (bool) => { confirmModal.close(); f(bool); };
    confirmModal.showModal();
}

function getMostRecentWednesdayMidnight() {
    const currentDate = new Date();
    const currentDayOfWeek = currentDate.getDay();
    const daysToSubtract = (currentDayOfWeek+3) % 7; // Calculate days to subtract to reach the most recent Saturday

    // Subtract days to get the timestamp for the most recent Saturday midnight
    currentDate.setDate(currentDate.getDate() - daysToSubtract);
    currentDate.setHours(0, 0, 0, 0); // Set the time to midnight

    return currentDate;
}

function formatDateToMMDD(date) {
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is zero-based, so we add 1
    const day = date.getDate().toString().padStart(2, '0');

    return `${month}/${day}`;
}

function exportWeek(e) {
    const visits = [];
    const endTime = getMostRecentWednesdayMidnight();
    const startTime = new Date();
    startTime.setDate(endTime.getDate() - 7);
    startTime.setHours(0, 0, 0, 0);
    const endTimePretty = new Date();
    endTimePretty.setDate(endTime.getDate() - 1);
    endTimePretty.setHours(0, 0, 0, 0);

    console.log(startTime);
    console.log(endTime);

    visits.push(["Student", "ID", "Course", "Professor", "Problem Description", "Time In", "Time Out", "Total Time (min)"]);
    visitCollection.where('owner', '==', globalUser.uid).where('timeIn', '>', startTime).where('timeIn', '<', endTime).get().then((qS) => {
        qS.forEach((doc) => {
            data = doc.data();
            let timeOut;
            let totalTime;
            if (data.isDone) {
                timeOut = data.timeOut;
                totalTime = timeOut - data.timeIn;
            } else {
                timeOut = "undefined";
                totalTime = "undefined";
            }
            visits.push([
                data.student,
                data.id,
                data.className,
                data.prof,
                data.reason,
                convertTimestampToHumanReadable(data.timeIn),
                convertTimestampToHumanReadable(timeOut),
                Math.round(totalTime/60)
            ]);
        });
        download2Darray(`visits_${formatDateToMMDD(startTime)}-${formatDateToMMDD(endTimePretty)}`, visits);
    });
}

function exportAll(e) {
    const quarterNames = new Map();
    const visits = [];
    visits.push(["Quarter", "Student", "ID", "Course", "Professor", "Problem Description", "Time In", "Time Out", "Total Time (min)"]);
    quarterCollection.where('owner', '==', globalUser.uid).get().then((qS) => {
        qS.forEach((doc) => {
            data = doc.data();
            quarterNames[doc.id] = data.name;
        });
        visitCollection.where('owner', '==', globalUser.uid).get().then((qS) => {
            qS.forEach((doc) => {
                data = doc.data();
                let quarterName;
                if (quarterNames.has(data.quarter)) {
                    quarterName = quarterNames.get(data.quarter);
                } else {
                    quarterName = "undefined";
                }
                let timeOut;
                let totalTime;
                if (data.isDone) {
                    timeOut = data.timeOut;
                    totalTime = timeOut - data.timeIn;
                } else {
                    timeOut = "undefined";
                    totalTime = "undefined";
                }
                visits.push([
                    quarterName,
                    data.student,
                    data.id,
                    data.className,
                    data.prof,
                    data.reason,
                    convertTimestampToHumanReadable(data.timeIn),
                    convertTimestampToHumanReadable(timeOut),
                    Math.round(totalTime/60)
                ]);
            });
            download2Darray("all_visits", visits);
        });
    });
}

function convertTimestampToHumanReadable(ts) {
    if (ts == "undefined") {
        return ts
    }
    const milliseconds = ts.seconds * 1000 + ts.nanoseconds / 1e6;
    const date = new Date(milliseconds);

    // You can format the date as you like
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return date.toLocaleString('en-US', options);
}

function secondsToHHMM(seconds) {
    if (seconds == "undefined") {
        return seconds;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const HH = hours < 10 ? '0' + hours : hours;
    const MM = minutes < 10 ? '0' + minutes : minutes;

    return `${HH}:${MM}`;
}

function download2Darray(fname, array) {
    // Convert the 2D array to a CSV string with values wrapped in double quotes
    const csvContent = array.map(row =>
        row.map(value => `"${value}"`).join(',')
    ).join('\n');

    // Create a data URI for the CSV content
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);

    // Create an anchor element to trigger the download
    const anchor = document.createElement('a');
    anchor.setAttribute('href', dataUri);
    anchor.setAttribute('download', fname + '.csv');

    // Simulate a click event to trigger the download
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
}
