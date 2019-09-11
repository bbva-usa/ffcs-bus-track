import React, {Component} from 'react';
import {render} from 'react-dom';
import MapGL, { Marker, GeolocateControl } from 'react-map-gl';

import ControlPanel from './control-panel';
import PolylineOverlay from './PolylineOverlay';
import moment from 'moment';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZmZjcy1idXMtdHJhY2siLCJhIjoiY2swZTBuZTY4MGJxcTNkcXhhcHd0b2ptZCJ9.PapNKyNrTFC8RRxFoltSRg'; // Set your mapbox token here
const BUS_API = 'https://tnnze9frd0.execute-api.us-east-1.amazonaws.com/dev'
const geolocateStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  margin: 10
};

export default class App extends Component {
  state = {
    viewport: {
      latitude: 33.4720095,
      longitude: -86.9247124,
      zoom: 13.3,
      bearing: 0
    },
    interactionState: {},
    settings: {
      dragPan: true,
      dragRotate: true,
      scrollZoom: true,
      touchZoom: true,
      touchRotate: true,
      keyboard: true,
      doubleClickZoom: true,
      minZoom: 0,
      maxZoom: 20,
      minPitch: 0,
      maxPitch: 85
    },
    routes: [],
    route: {},
    pointsOfInterest: [],
    directions: [],
    allDirections: [],
    currentTime: moment().format('Hmm')
  };

  componentDidMount() {
    fetch(BUS_API + '/routes').then(res => res.json()).then(routes => {
      let sortedRoutes = routes.sort((a,b) => ('' + a.name).localeCompare(b.name))

      let firstRoute = sortedRoutes[0]

      this._getDirections(firstRoute)
      this.setState({routes: sortedRoutes, route: firstRoute})}
    )

    fetch(BUS_API + '/pointsOfInterest').then(res => res.json()).then(pois => {
      this.setState({ pointsOfInterest: pois })
    })
  };

  handleSelectRoute(e){
    e.preventDefault();

    let selectedRoute, morningOnly, afternoonOnly;
    if (!e.target.value.startsWith('14-03 Robinson Elementary')) {
      morningOnly = false;
      afternoonOnly = false;
      selectedRoute = this.state.routes.filter(r => r.name == e.target.value && r.timeOfDay == this.state.route.timeOfDay)[0]
    }
    else if (e.target.value.includes('Dinner')) {
      morningOnly = false;
      afternoonOnly = true;
      selectedRoute = this.state.routes.filter(r => r.name == e.target.value && r.timeOfDay == 'afternoon')[0]
    }
    else {
      morningOnly = true;
      afternoonOnly = false;
      selectedRoute = this.state.routes.filter(r => r.name == e.target.value && r.timeOfDay == 'morning')[0]
    }

    let center = this._findCenter(selectedRoute.coordinates.map(c => [parseFloat(c.longitude), parseFloat(c.latitude)]))

    let viewport = Object.assign({}, this.state.viewport)
    viewport.latitude = center[1]
    viewport.longitude = center[0]
    viewport.zoom = 13.3

    this.setState({route: selectedRoute, morningOnly, afternoonOnly, viewport})
    this._getDirections(selectedRoute)
  }

  handleSelectTime(e){
    e.preventDefault();

    let selectedRoute = this.state.routes.filter(r => r.timeOfDay == e.target.value && r.name == this.state.route.name)[0]
    this.setState({route: selectedRoute})
    this._getDirections(selectedRoute)
  }

  _findCenter (arr) {
    var minX, maxX, minY, maxY;
    for (var i = 0; i < arr.length; i++)
    {
      minX = (arr[i][0] < minX || minX == null) ? arr[i][0] : minX;
      maxX = (arr[i][0] > maxX || maxX == null) ? arr[i][0] : maxX;
      minY = (arr[i][1] < minY || minY == null) ? arr[i][1] : minY;
      maxY = (arr[i][1] > maxY || maxY == null) ? arr[i][1] : maxY;
    }
    return [(minX + maxX) / 2, (minY + maxY) / 2];
  }

  _onViewportChange = viewport => this.setState({viewport});

  _onInteractionStateChange = interactionState => this.setState({interactionState});

  _onSettingChange = (name, value) =>
    this.setState({
      settings: {...this.state.settings, [name]: value}
    });

  _renderMarker(station, i, routes) {
    const {location, latitude, longitude, time} = station;

    let stationClass = 'station';
    if (parseInt(time) < this.state.currentTime) {
      stationClass += ' station-passed'
    }
    else if(this.state.currentTime <= parseInt(time) && (i == 0 || this.state.currentTime > parseInt(routes[i-1].time))) {
      stationClass += ' station-next'
    }

    return (
      <Marker
        key={i}
        longitude={parseFloat(longitude)}
        latitude={parseFloat(latitude)}
        captureDrag={false}
        captureDoubleClick={false}
      >
        <div class='station-wrapper'>
          <div className="station-time">{moment(time, 'Hmm').format('h:mm a')}</div>
          <div className={stationClass}>
            <span>{location}</span>
          </div>
        </div>
      </Marker>
    );
  }

  _renderPOI(station, i, pois) {
    const { location, latitude, longitude, name, type } = station;
    let imgSrc = "https://cdn.iconscout.com/icon/premium/png-256-thumb/school-1751304-1491663.png";
    switch (type) {
      case "school":
        imgSrc = "https://cdn.iconscout.com/icon/premium/png-256-thumb/school-1751304-1491663.png";
        break;
      case "library":
        imgSrc = "https://png.pngtree.com/svg/20161017/library_38447.png";
        break;
      case "stadium":
        imgSrc = "http://icons.iconarchive.com/icons/google/noto-emoji-travel-places/1024/42476-stadium-icon.png";
        break;
    }

    return (
      <Marker
        key={i}
        longitude={parseFloat(longitude)}
        latitude={parseFloat(latitude)}
        captureDrag={false}
        captureDoubleClick={false}
      >
        <div className="poi station">
          <img src={imgSrc} height="30" width="30"></img>
          <span>{name}<br/>{location}</span>
        </div>
      </Marker>
    );
  }

  _onTimeInputChange(e) {
    let time = moment(e.target.value, 'HH:mm').format('Hmm')

    this._getDirections(this.state.route, time)
    this.setState({currentTime: time})
  }

  _getDirections(route, time = this.state.currentTime) {
    let stops = route.coordinates.sort((a,b) => parseInt(a.time) - parseInt(b.time))

    let coordinates = stops.filter(s => parseInt(s.time) >= time).map(stop => stop.longitude + ',' + stop.latitude).join(';')
    let allCoordinates = stops.map(stop => stop.longitude + ',' + stop.latitude).join(';')

    if (coordinates) {
      let url = 'https://api.mapbox.com/directions/v5/mapbox/driving/' + coordinates + '?access_token=' + MAPBOX_TOKEN + '&geometries=geojson&overview=full'
      fetch(url).then(res => res.json()).then(res => this.setState({directions: res.routes[0].geometry.coordinates}))
    }
    else {
      this.setState({directions: []})
    }

    if (allCoordinates) {
      let allUrl = 'https://api.mapbox.com/directions/v5/mapbox/driving/' + allCoordinates + '?access_token=' + MAPBOX_TOKEN + '&geometries=geojson&overview=full'
      fetch(allUrl).then(res => res.json()).then(res => this.setState({allDirections: res.routes[0].geometry.coordinates}))
    }
    else {
      this.setState({allDirections: []})
    }
  }

  unique(value, index, self) {
    return self.indexOf(value) === index;
  }

  render() {
    const {viewport, settings, interactionState, route, routes, directions, allDirections, pointsOfInterest} = this.state;

    let routeNames = routes.map(r => r.name).filter(this.unique).map(r => <option key={r} value={r}>{r}</option>)

    return (
      <MapGL
        {...viewport}
        {...settings}
        width="100%"
        height="100%"
        mapStyle="mapbox://styles/mapbox/dark-v9"
        onViewportChange={this._onViewportChange}
        onInteractionStateChange={this._onInteractionStateChange}
        mapboxApiAccessToken={MAPBOX_TOKEN}
      >
        <select onChange={this.handleSelectRoute.bind(this)} value={this.state.route.name} className="custom-select custom-select-routes">
          {routeNames}
        </select>
        <input onChange={this._onTimeInputChange.bind(this)} className="custom-input" type="time" value={moment(this.state.currentTime, 'Hmm').format('HH:mm')}></input>
        <select onChange={this.handleSelectTime.bind(this)} value={this.state.route.timeOfDay} className="custom-select custom-select-time">
          {this.state.afternoonOnly || <option value="morning">Morning</option>}
          {this.state.morningOnly || <option value="afternoon">Afternoon</option>}
        </select>
        <PolylineOverlay color='gray' points={allDirections}/>
        <PolylineOverlay points={directions}/>
        {route.coordinates && route.coordinates.map(this._renderMarker.bind(this))}
        {pointsOfInterest && pointsOfInterest.map(this._renderPOI.bind(this))}
        <GeolocateControl
          style={geolocateStyle}
          positionOptions={{enableHighAccuracy: true}}
          trackUserLocation={true}
        />
      </MapGL>
    );
  }
}

export function renderToDom(container) {
  render(<App />, container);
}
