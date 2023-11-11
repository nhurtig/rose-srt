const visits = document.querySelector("#visits");
const studentList = document.getElementById('students');
const addVisitModal = document.getElementById('addVisit');
const modalForm = document.getElementById("modalForm");
const modalInfo = document.getElementById("modalInfo");

const db = firebase.firestore();

// Reference to the "visit" collection
const visitCollection = db.collection("visit");
const quarterCollection = db.collection("quarter");

var currentQuarter;
// Find current quarter
quarterCollection.orderBy("birthday", "desc").limit('1').get().then((snap) => {
    currentQuarter = snap.docs[0];
    populatePage();
});

function populatePage() {
    visits.innerHTML = `      <tr>
        <th>Name</th>
        <th>Course</th>
        <th>Professor</th>
        <th>Reason</th>
        <th>Time in</th>
        <th>Time out</th>
      </tr>
`
    // Populate table
    const students = new Set();
    visitCollection.where('quarter', '==', db.doc('quarter/' + currentQuarter.id))
        .orderBy('isDone').orderBy('timeIn', 'desc').get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                addVisit(doc)
                students.add(doc.data().student);
            });
            // Populate datalist of students
            studentList.innerHTML = "";
            for (const student of students.keys()) {
                studentList.innerHTML += `<option>${student}</option>`;
            }
        });
}

function makeData(str) {
    console.log(str);
    return "<td>" + str + "</td>";
}

function printTimestamp(ts) {
    if (!ts) {
        return "NULL";
    }
    date = new Date(ts.seconds * 1000);
    str = ""
    str += date.getMonth();
    mins = date.getMinutes();
    mins = ("0" + mins).slice(-2);
    str += "/" + date.getDay() + "/" + (date.getYear() - 100) + " " + date.getHours() + ":" + mins;
    return str;
}

function checkOutButton(id) {
    return `<button onclick="checkOut('${id}')">Check out</button>`
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

function fillRow(row, data, doc) {
    row.innerHTML = "";
    row.innerHTML += makeData(data.student);
    row.innerHTML += makeData(data.className);
    row.innerHTML += makeData(data.prof);
    row.innerHTML += makeData(data.reason);
    row.innerHTML += makeData(printTimestamp(data.timeIn));
    if (data.isDone) {
        row.innerHTML += makeData(printTimestamp(data.timeOut));
    } else {
        row.innerHTML += makeData(checkOutButton(doc.id));
    }
}

function addVisit(doc) {
    const data = doc.data();
    const row = document.createElement("tr");
    row.id = doc.id;
    fillRow(row, data, doc)
    visits.appendChild(row);
}

const addStudentForm = document.getElementById("addStudent")
const addCourseForm = document.getElementById("addCourse");

addStudentForm.addEventListener('submit', submitHandler);
addCourseForm.addEventListener('submit', courseHandler);

function submitHandler(e) {
    e.preventDefault();
    modalForm.reset();
    const studentName = addStudentForm.name.value;
    modalForm.name.value = studentName;
    addVisitModal.showModal();
    modalForm.class.focus();
    addStudentForm.reset();

    // get student's info
    const courses = new Set();
    visitCollection.where('quarter', '==', db.doc('quarter/' + currentQuarter.id))
        .where('student', '==', studentName).get().then((qS) => {
            qS.forEach((doc) => {
                data = doc.data();
                courses.add([data.className, data.prof]);
            });
            modalInfo.innerHTML = "";
            for (const course of courses.keys()) {
                modalInfo.innerHTML += `<button onclick="modalCourse('${course[0]}', '${course[1]}')">${course[0]}/${course[1]}</button>`
            }
        });
}

function courseHandler(e) {
    e.preventDefault();
    modalForm.reset();
    const className = addCourseForm.name.value;
    modalForm.class.value = className;
    addVisitModal.showModal();
    modalForm.name.focus();
    addCourseForm.reset();

    // get course's info
    const students = new Set();
    visitCollection.where('quarter', '==', db.doc('quarter/' + currentQuarter.id))
        .where('className', '==', className).get().then((qS) => {
            qS.forEach((doc) => {
                data = doc.data();
                students.add([data.student, data.prof]);
            });
            modalInfo.innerHTML = "";
            for (const course of students.keys()) {
                modalInfo.innerHTML += `<button onclick="modalStudent('${course[0]}', '${course[1]}')">${course[0]}/${course[1]}</button>`
            }
        });
}

function modalCourse(cname, prof) {
    modalForm.reason.focus();
    modalForm.class.value = cname;
    modalForm.prof.value = prof;
}

function modalStudent(student, prof) {
    modalForm.reason.focus();
    modalForm.name.value = student;
    modalForm.prof.value = prof;
}
