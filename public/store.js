const visits = document.querySelector("#visits");

const db = firebase.firestore();

// Reference to the "visit" collection
const visitCollection = db.collection("visit");

// Populate page
visitCollection.get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
        // Access the "name" field in each document and add it to the list
        addVisit(doc)
    });
});

function makeData(str) {
    console.log(str);
    return "<td>" + str + "</td>";
}

function printTimestamp(ts) {
    if (!ts) {
        return "NULL";
    }
    date = new Date(ts.seconds*1000);
    str = ""
    str += date.getMonth();
    mins = date.getMinutes();
    mins = ("0" + mins).slice(-2);
    str += "/" + date.getDay() + "/" + (date.getYear()-100) + " " + date.getHours() + ":" + mins;
    return str;
}

function addVisit(doc) {
    const data = doc.data();
    const row = document.createElement("tr");
    console.log(data.prof);
    data.student.get().then((stDoc) => {
        row.innerHTML += makeData(stDoc.data().name);
        row.innerHTML += makeData(data.className);
        row.innerHTML += makeData(data.prof);
        row.innerHTML += makeData(data.reason);
        row.innerHTML += makeData(printTimestamp(data.timeIn));
        row.innerHTML += makeData(printTimestamp(data.timeOut));
        visits.appendChild(row);
    });
}
