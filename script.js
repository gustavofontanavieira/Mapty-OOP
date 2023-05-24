'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const alertBg = document.querySelector('.alert__bg');
const alertWin = document.querySelector('.alert__window');
const alertMsg = document.querySelector('.alert__message');
const alertBtn = document.querySelector('.alert__button');

class Workout {
  date = new Date();
  id = (new Date().getTime() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.click++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //min/km
    this.pace = Math.trunc(this.duration / this.distance);
    return this.pace;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/*
const run1 = new Running([39, -12], 5.2, 24, 178);
const cyc1 = new Cycling([39, -10], 5.2, 24, 178);
console.log(run1, cyc1);
 */

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    alertBtn.addEventListener('click', this._closeAlertWindow);
  }

  //_______________________________________________________________________________________________________________________
  _getPosition() {
    navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
      alert(`Couldn't get your position`);
    });
  }

  //_______________________________________________________________________________________________________________________
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    this.#map.on('click', this._showForm.bind(this));

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#workouts.forEach(item => {
      this._renderWorkoutMarker(item);
    });
  }

  //_______________________________________________________________________________________________________________________
  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  //_______________________________________________________________________________________________________________________
  _hideForm() {
    //clear input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  //_______________________________________________________________________________________________________________________
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  //_______________________________________________________________________________________________________________________
  _closeAlertWindow() {
    alertBg.classList.add('alert__hidden');
    alertWin.classList.add('alert__hidden');
  }

  //_______________________________________________________________________________________________________________________
  _openAlertWindow(msg) {
    alertBg.classList.remove('alert__hidden');
    alertWin.classList.remove('alert__hidden');
    alertMsg.textContent = msg;
  }

  //_______________________________________________________________________________________________________________________
  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(item => Number.isFinite(item));

    const allPositive = (...inputs) => inputs.every(item => item > 0);

    e.preventDefault();

    const type = inputType.value;
    //converting to a number
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(cadence, distance, duration) ||
        !allPositive(cadence, distance, duration)
      ) {
        return this._openAlertWindow('Inputs have to be positive numbers run');
      }
      workout = new Running(this.#mapEvent.latlng, distance, duration, cadence);
      this.#workouts.push(workout);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return this._openAlertWindow(
          'Inputs have to be positive numbers cycling'
        );

      workout = new Cycling(
        this.#mapEvent.latlng,
        distance,
        duration,
        elevation
      );
      this.#workouts.push(workout);
    }

    this._renderWorkout(workout);

    this._hideForm();

    //display mark
    this._renderWorkoutMarker(workout);

    //set to localstorage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${inputType.value}-popup`,
        })
      )
      .openPopup()
      .setPopupContent(
        `${inputType.value == 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      );
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
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
      </div>`;

    if (workout.type === 'running')
      html += `<div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed()}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;

    if (workout.type === 'cycling')
      html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed()}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">spm</span>
      </div>
      </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(work => {
      return work.id == workoutEl.dataset.id;
    });

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    /* workout.click(); */
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(item => {
      this._renderWorkout(item);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
