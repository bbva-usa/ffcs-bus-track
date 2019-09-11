import React, {Component} from 'react';
import {render} from 'react-dom';
import MapGL, {Marker} from 'react-map-gl';
import ControlPanel from './control-panel';
import PolylineOverlay from './PolylineOverlay';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZmZjcy1idXMtdHJhY2siLCJhIjoiY2swZTBuZTY4MGJxcTNkcXhhcHd0b2ptZCJ9.PapNKyNrTFC8RRxFoltSRg'; // Set your mapbox token here
const BUS_API = 'https://tnnze9frd0.execute-api.us-east-1.amazonaws.com/dev'

import MARKER_STYLE from './marker-style';

export default class App extends Component {
  state = {
    viewport: {
      latitude: 33.477702,
      longitude: -86.915183,
      zoom: 11,
      bearing: 0,
      pitch: 50
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
    directions: []
  };

  componentDidMount() {
    fetch(BUS_API + '/routes').then(res => res.json()).then(routes => {
      let sortedRoutes = routes.sort((a,b) => ('' + a.name).localeCompare(b.name))
      
      let firstRoute = sortedRoutes[0]

      this._getDirections(firstRoute)
      this.setState({routes: sortedRoutes, route: firstRoute})}
    )
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

    this.setState({route: selectedRoute, morningOnly, afternoonOnly})
    this._getDirections(selectedRoute)

    // this.setState({selected_bus: selection}
    // () => { //update selected bus route
    //   let geojson = 'https://data.calgary.ca/resource/hpnd-riq4.geojson?route_short_name='+this.state.selected_bus

    //   fetch(geojson)
    //     .then(response => {
    //         return response.json();
    //     }).then(data => {
    //         let turf_center = center(data); //find center of bus route using Turf
    //         let center_coord = turf_center.geometry.coordinates;
    //         this.map.flyTo({
    //          center: center_coord,
    //          zoom: 12
    //         });
    //     });

    //   this.map.getSource('Bus Route').setData(geojson); //update data source through Mapbox setData()

    // });
  }

  handleSelectTime(e){
    e.preventDefault();

    let selectedRoute = this.state.routes.filter(r => r.timeOfDay == e.target.value && r.name == this.state.route.name)[0]
    this.setState({route: selectedRoute})
    this._getDirections(selectedRoute)

    // this.setState({selected_bus: selection}
    // () => { //update selected bus route
    //   let geojson = 'https://data.calgary.ca/resource/hpnd-riq4.geojson?route_short_name='+this.state.selected_bus

    //   fetch(geojson)
    //     .then(response => {
    //         return response.json();
    //     }).then(data => {
    //         let turf_center = center(data); //find center of bus route using Turf
    //         let center_coord = turf_center.geometry.coordinates;
    //         this.map.flyTo({
    //          center: center_coord,
    //          zoom: 12
    //         });
    //     });

    //   this.map.getSource('Bus Route').setData(geojson); //update data source through Mapbox setData()

    // });
  }

  _onViewportChange = viewport => this.setState({viewport});

  _onInteractionStateChange = interactionState => this.setState({interactionState});

  _onSettingChange = (name, value) =>
    this.setState({
      settings: {...this.state.settings, [name]: value}
    });

  _renderMarker(station, i) {
    const {location, latitude, longitude, time} = station;
    return (
      <Marker
        key={i}
        longitude={parseFloat(longitude)}
        latitude={parseFloat(latitude)}
        captureDrag={false}
        captureDoubleClick={false}
      >
        <div className="station">
          <span>{location + ' - ' + time}</span>
        </div>
      </Marker>
    );
  }

  _getDirections(route) {
    let stops = route.coordinates.sort((a,b) => a.time - b.time)
    let coordinates = stops.map(stop => stop.longitude + ',' + stop.latitude).join(';')
    let url = 'https://api.mapbox.com/directions/v5/mapbox/driving/' + coordinates + '?access_token=' + MAPBOX_TOKEN + '&geometries=geojson&overview=full'

    fetch(url).then(res => res.json()).then(res => this.setState({directions: res.routes[0].geometry.coordinates}))
  }

  unique(value, index, self) { 
    return self.indexOf(value) === index;
  }

  render() {
    const {viewport, settings, interactionState, route, routes, directions} = this.state;

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
        <select onChange={this.handleSelectTime.bind(this)} value={this.state.route.timeOfDay} className="custom-select custom-select-time">
          {this.state.afternoonOnly || <option value="morning">Morning</option>}
          {this.state.morningOnly || <option value="afternoon">Afternoon</option>}
        </select>
        <style>{MARKER_STYLE}</style>
        <PolylineOverlay points={directions}/>
        {route.coordinates && route.coordinates.map(this._renderMarker)}
      </MapGL>
    );
  }
}

export function renderToDom(container) {
  render(<App />, container);
}
