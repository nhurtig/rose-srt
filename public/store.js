const visits = document.querySelector("#visits");
const studentList = document.getElementById('students');
const courseList = document.getElementById('courses');
const addVisitModal = document.getElementById('addVisit');
const modalForm = document.getElementById("modalForm");
const modalInfo = document.getElementById("modalInfo");
const modalCancel = document.getElementById("modalCancel");

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
        <th></th>
        <th></th>
      </tr>
`
    // Populate table
    const students = new Set();
    const classes = new Set();
    visitCollection.where('quarter', '==', db.doc('quarter/' + currentQuarter.id))
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
}

function makeData(str) {
    return "<td>" + str + "</td>";
}

function printTimestamp(ts) {
    if (!ts) {
        return "NULL";
    }
    date = new Date(ts.seconds * 1000);
    str = ""
    str += date.getMonth() + 1;
    mins = date.getMinutes();
    mins = ("0" + mins).slice(-2);
    str += "/" + (date.getDay()+1) + "/" + (date.getYear() - 100) + " " + date.getHours() + ":" + mins;
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

    const names = ['name', 'className', 'prof', 'reason', 'timeIn', 'timeOut']
    for (let i = 0; i < 6; i++) {
        const cell = cells[i];
        const currentValue = cell.textContent;
        const input = document.createElement('input');
        input.id = names[i] + id;
        if (i < 4) {
            input.type = 'text';
            input.value = currentValue;
        } else {
            input.type = 'datetime-local';
            if (currentValue != "Check out") {
                dateTime = currentValue.split(' ');
                date = dateTime[0];
                dateSplit = date.split('/');
                month = dateSplit[0];
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
            name: document.getElementById('name' + id).value,
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
        document.getElementById('timeOut'+id).value = null;
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
    visitCollection.doc(id).delete().then((doc) => {
        document.getElementById(id).remove();
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

addStudentForm.addEventListener('submit', submitHandler);
addCourseForm.addEventListener('submit', courseHandler);

function submitHandler(e) {
    e.preventDefault();
    modalForm.reset();
    const studentName = addStudentForm.name.value;
    modalForm.name.value = studentName;
    modalInfo.innerHTML = '<button type="button" style="visibility: hidden;">autofill</button>';
    addVisitModal.showModal();
    modalForm.class.focus();
    addStudentForm.reset();

    // get student's info
    const courses = new Set();
    visitCollection.where('quarter', '==', db.doc('quarter/' + currentQuarter.id))
        .where('student', '==', studentName).get().then((qS) => {
            qS.forEach((doc) => {
                data = doc.data();
                courses.add(data.className + ';' + data.prof);
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
    modalForm.class.value = className;
    modalInfo.innerHTML = '<button type="button" style="visibility: hidden;">autofill</button>';
    addVisitModal.showModal();
    modalForm.name.focus();
    addCourseForm.reset();

    // get course's info
    const students = new Set();
    visitCollection.where('quarter', '==', db.doc('quarter/' + currentQuarter.id))
        .where('className', '==', className).get().then((qS) => {
            qS.forEach((doc) => {
                data = doc.data();
                students.add(data.student + ';' + data.prof);
            });
            modalInfo.innerHTML = '';
            for (const courseStr of students.keys()) {
                course = courseStr.split(';');
                modalInfo.innerHTML += `<button type="button" onclick="modalStudent('${course[0]}', '${course[1]}')">${course[0]}/${course[1]}</button>`
            }
            fixModalButtons();
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
        quarter: quarterCollection.doc(currentQuarter.id)
    }).then((doc) => {
        doc.get().then((doc) => {
            addVisit(doc, true);
        });
    });
}
