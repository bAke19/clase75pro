import React, { Component } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ImageBackground,
  Image,
  Alert,
  ToastAndroid,
  KeyboardAvoidingView
} from "react-native";
import * as Permissions from "expo-permissions";
import { BarCodeScanner } from "expo-barcode-scanner";

import {getDoc, 
  doc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  Timestamp, 
  addDoc, 
  increment } from 'firebase/firestore'
import db from '../config'

const bgImage = require("../assets/background2.png");
const appIcon = require("../assets/appIcon.png");
const appName = require("../assets/appName.png");

export default class TransactionScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bookId: "",
      studentId: "",
      domState: "normal",
      hasCameraPermissions: null,
      scanned: false,
      bookName: "",
      studentName: ""
    };
  }

  getCameraPermissions = async domState => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);

    this.setState({
      /*status === "granted" es true cuando el usuario ha concedido permiso
          status === "granted" es false cuando el usuario no ha concedido permiso
        */
      hasCameraPermissions: status === "granted",
      domState: domState,
      scanned: false
    });
  };

  handleBarCodeScanned = async ({ type, data }) => {
    const { domState } = this.state;

    if (domState === "bookId") {
      this.setState({
        bookId: data,
        domState: "normal",
        scanned: true
      });
    } else if (domState === "studentId") {
      this.setState({
        studentId: data,
        domState: "normal",
        scanned: true
      });
    }
  };

  handleTransaction = async () => {
    var { bookId, studentId } = this.state;
    await this.getBookDetails(bookId);
    await this.getStudentDetails(studentId);

    var transactionType = await this.checkBookAvailability(bookId);

    if (!transactionType) {
      this.setState({ bookId: "", studentId: "" });
      // Solo para usuarios Android
      // ToastAndroid.show("El libro no existe en la base de datos", ToastAndroid.SHORT);
      Alert.alert("El libro no existe en la base de datos");
    } else if (transactionType === "issue") {
      var isEligible = await this.checkStudentEligibilityForBookIssue(
        studentId
      );

      if (isEligible) {
        var { bookName, studentName } = this.state;
        this.initiateBookIssue(bookId, studentId, bookName, studentName);
      }
      // Solo para usuarios Android
      // ToastAndroid.show("Libro emitido al alumno", ToastAndroid.SHORT);
      Alert.alert("Libro emitido al alumno");
    } else {
      var isEligible = await this.checkStudentEligibilityForBookReturn(
        bookId,
        studentId
      );

      if (isEligible) {
        var { bookName, studentName } = this.state;
        this.initiateBookReturn(bookId, studentId, bookName, studentName);
      }
      //  Solo para usuarios Android
      // ToastAndroid.show("Libro devuelto a la biblioteca", ToastAndroid.SHORT);
      Alert.alert("Libro devuelto a la biblioteca");
    }
  };

  getBookDetails = async bookId => {
    bookId = bookId.trim();

    const bookRef = collection(db, "books");
// Create a query against the collection.
  	const q = query(bookRef, where("book_id", "==",  bookId));
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      this.setState({
        bookName: doc.data().book_details.book_name
      });
    });
    
  };


  getStudentDetails = async studentId => {
    studentId = studentId.trim();

    const bookRef = collection(db, "students");
// Create a query against the collection.
  	const q = query(bookRef, where("student_id", "==", studentId));
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      // doc.data() is never undefined for query doc snapshots
      //console.log(doc.id, " => ", doc.data());
      this.setState({
        studentName: doc.data().student_details.student_name
      });
    });
  };

  checkBookAvailable = async (bookId) => {
    const bookRef = collection(db, 'books');
    const consulta = query(bookRef, where("book_id", "==", bookId))

    const snapshotsRespuesta = await getDocs(consulta);
    var transactionType = ''
    if(snapshotsRespuesta.docs.length){
      transactionType = false
    }else{
      snapshotsRespuesta.forEach((doc)=>{
        transactionType = doc.data().is_book_available ? 'prestamo' : 'devolucion'
      })
    }
    
    return transactionType;

  }

  checkStudentEligibilityForBookIssue = async studentId => {
    const studentRef = collection(db, "students");
    // Create a query against the collection.
      const q = query(bookRef, where("student_id", "==", studentId));

    var isStudentEligible = "";
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      if(doc){
        studentRef.docs.map(doc => {
          if (doc.data().number_of_books_issued < 2) {
            isStudentEligible = true;
          } else {
            isStudentEligible = false;
            Alert.alert("El alumno ya tiene 2 libros");
            this.setState({
              bookId: "",
              studentId: ""
            });
          }
        });
        
      }else{
        this.setState({
          bookId: "",
          studentId: ""
        });
        isStudentEligible = false;
        Alert.alert("La id del alumno no existe en la base de dato");
      }
      
    })

    return isStudentEligible;
  };

  checkStudentEligibilityForBookReturn = async (bookId, studentId) => {
    const transactionRef = collection(db, "transactions");

    const q = query(bookRef, where("book_id", "==", bookId));
    const transactionSnapshot = await getDocs(q);

    var isStudentEligible = "";
    transactionSnapshot.docs.map(doc => {
      var lastBookTransaction = doc.data();
      if (lastBookTransaction.student_id === studentId) {
        isStudentEligible = true;
      } else {
        isStudentEligible = false;
        Alert.alert("El libro no fue emitido a este alumno");
        this.setState({
          bookId: "",
          studentId: ""
        });
      }
    });
    return isStudentEligible;
  };

  initiateBookIssue = async (bookId, studentId, bookName, studentName) => {

    const docRef = await addDoc(collection(db, 'transactions'), {
      student_id: studentId,
      student_name: studentName,
      book_id: bookId,
      book_name: bookName,
      date: Timestamp.now().toDate(),
      transaction_type: 'prestamo'
    });

    await updateDoc(doc(db, 'students', studentId),{
      number_of_books_issued: increment(1)
    });

    await updateDoc(doc(db, 'books', bookId),{
      is_book_available: false
    });

    this.setState({
      bookId: '',
      studentId: ''
    });

  }

  initiateBookReturn = async (bookId, studentId, bookName, studentName) => {

    const docRef = await addDoc(collection(db, 'transactions'), {
      student_id: studentId,
      student_name: studentName,
      book_id: bookId,
      book_name: bookName,
      date: Timestamp.now().toDate(),
      transaction_type: 'devolucion'
    });

    await updateDoc(doc(db, 'students', studentId),{
      number_of_books_issued: increment(-1)
    });

    await updateDoc(doc(db, 'books', bookId),{
      is_book_available: true
    });

    this.setState({
      bookId: '',
      studentId: ''
    });
  }

  render() {
    const { bookId, studentId, domState, scanned } = this.state;
    if (domState !== "normal") {
      return (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      );
    }
    return (
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <ImageBackground source={bgImage} style={styles.bgImage}>
          <View style={styles.upperContainer}>
            <Image source={appIcon} style={styles.appIcon} />
            <Image source={appName} style={styles.appName} />
          </View>
          <View style={styles.lowerContainer}>
            <View style={styles.textinputContainer}>
              <TextInput
                style={styles.textinput}
                placeholder={"Id del libro"}
                placeholderTextColor={"#FFFFFF"}
                value={bookId}
                onChangeText={text => this.setState({ bookId: text })}
              />
              <TouchableOpacity
                style={styles.scanbutton}
                onPress={() => this.getCameraPermissions("bookId")}
              >
                <Text style={styles.scanbuttonText}>Escanear</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.textinputContainer, { marginTop: 25 }]}>
              <TextInput
                style={styles.textinput}
                placeholder={"Id del alumno"}
                placeholderTextColor={"#FFFFFF"}
                value={studentId}
                onChangeText={text => this.setState({ studentId: text })}
              />
              <TouchableOpacity
                style={styles.scanbutton}
                onPress={() => this.getCameraPermissions("studentId")}
              >
                <Text style={styles.scanbuttonText}>Escanear</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.button, { marginTop: 25 }]}
              onPress={this.handleTransaction}
            >
              <Text style={styles.buttonText}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  bgImage: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center"
  },
  upperContainer: {
    flex: 0.5,
    justifyContent: "center",
    alignItems: "center"
  },
  appIcon: {
    width: 200,
    height: 200,
    resizeMode: "contain",
    marginTop: 80
  },
  appName: {
    width: 80,
    height: 80,
    resizeMode: "contain"
  },
  lowerContainer: {
    flex: 0.5,
    alignItems: "center"
  },
  textinputContainer: {
    borderWidth: 2,
    borderRadius: 10,
    flexDirection: "row",
    backgroundColor: "#9DFD24",
    borderColor: "#FFFFFF"
  },
  textinput: {
    width: "57%",
    height: 50,
    padding: 10,
    borderColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 3,
    fontSize: 18,
    backgroundColor: "#5653D4",
    fontFamily: "Rajdhani_600SemiBold",
    color: "#FFFFFF"
  },
  scanbutton: {
    width: 100,
    height: 50,
    backgroundColor: "#9DFD24",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  scanbuttonText: {
    fontSize: 24,
    color: "#0A0101",
    fontFamily: "Rajdhani_600SemiBold"
  },
  button: {
    width: "43%",
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F48D20",
    borderRadius: 15
  },
  buttonText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontFamily: "Rajdhani_600SemiBold"
  }
});