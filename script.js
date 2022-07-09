'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputSpeed = document.querySelector('.form__input--speed');
const inputElevation = document.querySelector('.form__input--elevation');

// create a workout parent class
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coord, distance, duration) {
    this.coord = coord; //{lat, lng}
    this.distance = distance; // in Km
    this.duration = duration; // in min
  }

  _setDescription() {
    //prettier - ignore;
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

//create a workout's child class "running"
class Running extends Workout {
  type = 'running';
  constructor(coord, distance, duration, speed) {
    super(coord, distance, duration);
    this.speed = speed;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //in min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

//create a workout's child class "cycling"
class Cycling extends Workout {
  type = 'cycling';
  constructor(coord, distance, duration, elevationGain) {
    super(coord, distance, duration);
    this.elevationGain = elevationGain;
    this.calcVelocity();
    this._setDescription();
  }
  calcVelocity() {
    // in km/h
    this.velocity = this.distance / (this.duration / 60);
    return this.velocity;
  }
}

// // create runnig instance
// const run1 = new Running([12.9, 77.6], 7.9, 31, 218);
// //create ccycling instance
// const cycling1 = new Cycling([13, 77.7], 18, 20, 400);

//////////////////////////////////////////////////////////////////
//////////////////////
//create class to handle the overall app/ app architecture
class App {
  //private fields
  #map;
  #mapEventVar;
  #workouts = [];
  #mapZoomNumb = 13;

  constructor() {
    //get user position
    this._getPosition();

    //get data from local storage
    this._getLocalStorage();
    // add event listners

    form.addEventListener('submit', this._addNewWorkout.bind(this));

    //toggle input fields on switching between workouts

    inputType.addEventListener('change', this._toggleInputField.bind(this));

    // event listner for marker movement

    containerWorkouts.addEventListener('click', this._moveMapMarker.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Mapty was not able to find your current location!');
        }
      );
    }
  }

  _loadMap(position) {
    //console.log(position);
    //getting latitude and longitude by deconstructing position object
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coord = [latitude, longitude];

    this.#map = L.map('map').setView(coord, this.#mapZoomNumb);

    L.tileLayer(
      'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
      }
    ).addTo(this.#map);

    //handling clicks on the map interface
    this.#map.on('click', this._showForm.bind(this));

    //render maps from the workouts array from local storage
    this.#workouts.forEach(w_out => {
      this._renderWorkoutMarker(w_out);
    });
  }

  _showForm(mapEvent) {
    this.#mapEventVar = mapEvent;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //clear all input fields
    inputElevation.value =
      inputSpeed.value =
      inputDuration.value =
      inputDistance.value =
        '';

    //hide the form
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleInputField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputSpeed.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _addNewWorkout(e) {
    //create a validity checking function using every.
    const validNumChecker = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    // checker function for positive numbers
    const isPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get the data from the form
    const type = inputType.value;
    console.log(type);
    const distance = inputDistance.value * 1;
    const duration = inputDuration.value * 1;
    const { lat, lng } = this.#mapEventVar.latlng;
    let workout;

    //check if running , create running instance
    if (type === 'running') {
      const speed = inputSpeed.value * 1;
      //Check if the data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(speed)
        !validNumChecker(distance, duration, speed) ||
        !isPositive(distance, duration, speed)
      )
        return alert('Inputs have to be positive numbers!!');

      workout = new Running([lat, lng], distance, duration, speed);
    }

    //check if cycling, create cycling instance
    if (type === 'cycling') {
      const elevGain = inputElevation.value * 1;

      if (
        !validNumChecker(distance, duration, elevGain) ||
        !isPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!!');

      workout = new Cycling([lat, lng], distance, duration, elevGain);
    }
    //add a new object to the workout array
    this.#workouts.push(workout);
    console.log(workout);

    //render marker on the map
    this._renderWorkoutMarker(workout);

    //render workout on the list
    this._renderWorkoutListElement(workout);

    //erase contents of the input fields to accept new workout log and hide the form
    this._hideForm();

    //add local storage for the workout instances
    this._addLocalStorage();
  }
  // display pin drop on the map interface
  _renderWorkoutMarker(workout) {
    L.marker(workout.coord)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'runnning' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkoutListElement(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      `;

    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">KM/hr</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.speed}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;
    }

    if (workout.type === 'cycling') {
      html += ` <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.velocity.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li> -->`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  // move the marker function
  _moveMapMarker(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coord, this.#mapZoomNumb, {
      animate: true,
      pan: {
        duration: 1.69,
      },
    });
  }

  // local storage helper function

  _addLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(w_out => {
      this._renderWorkoutListElement(w_out);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

//create a new app object of class App
const app = new App();
