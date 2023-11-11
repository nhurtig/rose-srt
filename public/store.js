const visits = document.querySelector("#visits");

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
    // Populate page
    visitCollection.where('quarter', '==', db.doc('quarter/' + currentQuarter.id))
        .orderBy('isDone').orderBy('timeIn', 'desc').get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                addVisit(doc)
            });
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
    data.student.get().then((stDoc) => {
        row.innerHTML += makeData(stDoc.data().name);
        row.innerHTML += makeData(data.className);
        row.innerHTML += makeData(data.prof);
        row.innerHTML += makeData(data.reason);
        row.innerHTML += makeData(printTimestamp(data.timeIn));
        if (data.isDone) {
            row.innerHTML += makeData(printTimestamp(data.timeOut));
        } else {
            row.innerHTML += makeData(checkOutButton(doc.id));
        }
    });
}

function addVisit(doc) {
    const data = doc.data();
    const row = document.createElement("tr");
    row.id = doc.id;
    fillRow(row, data, doc)
    visits.appendChild(row);
}
