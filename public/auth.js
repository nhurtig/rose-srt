var provider = new firebase.auth.GoogleAuthProvider();
var globalUser;

firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        globalUser = user;
        console.log(user);
        main();
    } else {
        firebase.auth().signInWithRedirect(provider);
    }
  });
