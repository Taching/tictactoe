import React, { Component } from "react";
import Game from "./Game";
import Board from "./Board";
import PubNubReact from "pubnub-react";
import Swal from "sweetalert2";
import shortid from "shortid";
import "./Game.css";

class App extends Component {
  constructor(props) {
    super(props);

    this.pubnub = new PubNubReact({
      publishKey: "pub-c-0d0a653d-4263-4c79-856c-d54d24fea181",
      subscribeKey: "sub-c-60d1e63c-b96f-11e9-9d6a-32d1f5783cf5"
    });

    this.state = {
      piece: "", // X or O
      isPlaying: false, // Set to true when 2 players are in channel
      isRoomCreator: false,
      isDisabled: false,
      myTurn: false
    };
    this.lobbyChannel = null; // Lobby Channel
    this.gameChannel = null; // Game channel
    this.roomId = null; // Unuque Id when player creates a room
    this.pubnub.init(this); // initialize Pubnub
  }
  componentDidUpdate() {
    if (this.lobbyChannel != null) {
      this.pubnub.getMessage(this.lobbyChannel, msg => {
        if (msg.message.notRoomCreator) {
          this.gameChannel = "tictactoegame--" + this.roomId;

          this.pubnub.subscribe({
            channels: [this.gameChannel]
          });

          this.setState({
            isPlaying: true
          });
          Swal.close();
        }
      });
    }
  }
  componentWillUnmount() {
    this.pubnub.unsubcribe({
      channels: [this.lobbyChannel, this.gameChannel]
    });
  }
  onPressCreate = e => {
    this.roomID = shortid.generate().substring(0, 5);
    this.lobbyChannel = "tictactoelobbby--" + this.roomId;

    this.pubnub.subscribe({
      channels: [this.lobbyChannel],
      withPresence: true
    });
    //MODAL

    Swal.fire({
      position: "top",
      allowOutsideClick: false,
      title: "Share this room ID with your friend",
      text: this.roomId,
      width: 275,
      padding: "0.7em",
      //custom CSS
      customClass: {
        heightAuto: false,
        title: "title-class",
        popup: "popup-class",
        confirmButton: "button-class"
      }
    });

    this.setState({
      piece: "X",
      isRoomCreator: true,
      isDisabled: true,
      myTurn: true
    });
  };

  onPressJoin = e => {
    Swal.fire({
      position: "top",
      input: "text",
      allowOutsideClick: false,
      inputPlaceholder: "Enter the room id",
      showCancelButton: true,
      confirmButtonColor: "rgb(208,33,41)",
      confirmButtonText: "OK",
      width: 275,
      padding: "0.7em",
      customClass: {
        heightAuto: false,
        popup: "popup-class",
        confirmButton: "join-button-class",
        cancelButton: "join-button-class"
      }
    }).then(result => {
      if (result.value) {
        this.joinRoom(result.value);
      }
    });
  };
  joinRoom = value => {
    this.roomId = value;
    this.lobbyChannel = "tictactoelobby--" + this.roomId;

    // Check the number of people in the channel
    this.pubnub
      .hereNow({
        channels: [this.lobbyChannel]
      })
      .then(response => {
        if (response.totalOccupancy < 2) {
          this.pubnub.subscribe({
            channels: [this.lobbyChannel],
            withPresence: true
          });

          this.setState({
            piece: "O"
          });

          this.pubnub.publish({
            message: {
              notRoomCreator: true
            },
            channel: this.lobbyChannel
          });
        } else {
          // Game in progress
          Swal.fire({
            position: "top",
            allowOutsideClick: false,
            title: "Error",
            text: "Game in progress. Try another room.",
            width: 275,
            padding: "0.7em",
            customClass: {
              heightAuto: false,
              title: "title-class",
              popup: "popup-class",
              confirmButton: "button-class"
            }
          });
        }
      })
      .catch(error => {
        console.log(error);
      });
  };

  render() {
    return (
      <div>
        <div className="title">
          <p>Tic Tac Toe</p>
        </div>
        {!this.state.isPlaying && (
          <div className="game">
            <div className="board">
              <Board squares={0} onClick={index => null} />
              <div className="button-container">
                <button
                  className="create-button"
                  disabled={this.state.isDisabled}
                  onClick={e => this.onPressCreate()}
                >
                  {" "}
                  Create
                </button>
                <button
                  className="join-button"
                  onClick={e => this.onPressJoin()}
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}
        {this.state.isPlaying && (
          <Game
            pubnub={this.pubnub}
            gameChannel={this.gameChannel}
            piece={this.state.piece}
            isRoomCreator={this.state.isRoomCreator}
            myTurn={this.state.myTurn}
            xUsername={this.state.xUsername}
            oUsername={this.state.oUsername}
            endGame={this.endGame}
          />
        )}
      </div>
    );
  }
}

export default App;
