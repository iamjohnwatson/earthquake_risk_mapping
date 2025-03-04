// static/app.js
const {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Card,
  CardContent,
  CircularProgress,
  Box,
  Grid,
  Tabs,
  Tab
} = MaterialUI;

class EarthquakeApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      earthquakes: [],
      analysis: {},
      error: null,
      currentTab: 0 // 0: Earthquake Map, 1: Risk Analysis
    };
  }

  componentDidMount() {
    fetch('/api/earthquakes')
      .then(response => response.json())
      .then(data => {
        const features = data.data.features;
        const analysis = data.analysis;
        this.setState({ 
          earthquakes: features,
          analysis: analysis,
          loading: false
        }, () => {
          // Initially render the earthquake map
          this.renderMapPlot();
        });
      })
      .catch(error => {
        this.setState({ error: error.toString(), loading: false });
      });
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.currentTab !== this.state.currentTab) {
      if (this.state.currentTab === 0) {
        this.renderMapPlot();
      } else if (this.state.currentTab === 1) {
        this.renderRiskAnalysisMap();
      }
    }
  }  

  handleTabChange = (event, newValue) => {
    this.setState({ currentTab: newValue });
  };

  renderMapPlot() {
    // Extract data arrays for the Plotly map
    const lats = this.state.earthquakes.map(eq => eq.geometry.coordinates[1]);
    const lons = this.state.earthquakes.map(eq => eq.geometry.coordinates[0]);
    const mags = this.state.earthquakes.map(eq => eq.properties.mag);
    const texts = this.state.earthquakes.map(eq => {
      return `Location: ${eq.properties.place}<br>Magnitude: ${eq.properties.mag}`;
    });

    const data = [{
      type: 'scattergeo',
      locationmode: 'world',
      lat: lats,
      lon: lons,
      hoverinfo: 'text',
      text: texts,
      marker: {
        size: mags.map(m => m * 4),  // Scale markers by magnitude
        color: mags,
        colorscale: 'Viridis',
        colorbar: {
          title: 'Magnitude'
        },
        line: {
          color: 'black',
          width: 0.5
        }
      }
    }];

    const layout = {
      title: 'Real-time Earthquake Data',
      geo: {
        scope: 'world',
        projection: { type: 'natural earth' },
        showland: true,
        landcolor: 'rgb(217, 217, 217)',
        subunitwidth: 1,
        countrywidth: 1,
        subunitcolor: 'rgb(255,255,255)',
        countrycolor: 'rgb(255,255,255)'
      },
      margin: { t: 50, b: 0, l: 0, r: 0 }
    };

    Plotly.newPlot('map', data, layout, {responsive: true});
  }

  renderRiskAnalysisMap() {
    // Aggregate earthquake data by region (extracted from the 'place' string)
    const earthquakes = this.state.earthquakes;
    let locationData = {};
    
    earthquakes.forEach(eq => {
      let place = eq.properties.place || "Unknown";
      // Extract region: if there's a comma, use the text after the last comma
      let region = place;
      if (place.includes(',')) {
        const parts = place.split(',');
        region = parts[parts.length - 1].trim();
      }
      
      // Get earthquake coordinates [lon, lat, depth]
      const coords = eq.geometry.coordinates;
      const lat = coords[1];
      const lon = coords[0];
      
      if (!locationData[region]) {
        locationData[region] = {
          count: 0,
          totalMag: 0,
          totalLat: 0,
          totalLon: 0
        };
      }
      
      const mag = eq.properties.mag;
      if (mag != null) {
        locationData[region].count += 1;
        locationData[region].totalMag += mag;
        locationData[region].totalLat += lat;
        locationData[region].totalLon += lon;
      }
    });
    
    // Prepare arrays for Plotly: regions, average coordinates, event count, and average magnitude
    const regions = Object.keys(locationData);
    const counts = [];
    const avgMags = [];
    const avgLats = [];
    const avgLons = [];
    const hoverText = [];
    
    regions.forEach(region => {
      const data = locationData[region];
      const count = data.count;
      const avgMag = count > 0 ? data.totalMag / count : 0;
      const avgLat = count > 0 ? data.totalLat / count : 0;
      const avgLon = count > 0 ? data.totalLon / count : 0;
      
      counts.push(count);
      avgMags.push(avgMag);
      avgLats.push(avgLat);
      avgLons.push(avgLon);
      hoverText.push(`Region: ${region}<br>Events: ${count}<br>Avg Mag: ${avgMag.toFixed(2)}`);
    });
    
    // Plot markers on a geographic map using Plotly scattergeo
    const dataPlot = [{
      type: 'scattergeo',
      locationmode: 'world',
      lat: avgLats,
      lon: avgLons,
      text: hoverText,
      marker: {
        size: counts.map(c => Math.min(c * 3, 50)), // Scale marker size by event count (capped for aesthetics)
        color: avgMags,                         // Color markers by average magnitude
        colorscale: 'Viridis',
        colorbar: { title: 'Avg Magnitude' },
        line: { color: 'black', width: 0.5 }
      },
      hoverinfo: 'text'
    }];
    
    const layout = {
      title: 'Risk Analysis by Location (Aggregated)',
      geo: {
        scope: 'world',
        projection: { type: 'natural earth' },
        showland: true,
        landcolor: 'rgb(217, 217, 217)',
        subunitwidth: 1,
        countrywidth: 1,
        subunitcolor: 'rgb(255,255,255)',
        countrycolor: 'rgb(255,255,255)'
      },
      margin: { t: 50, b: 0, l: 0, r: 0 }
    };
    
    Plotly.newPlot('risk-plot', dataPlot, layout, {responsive: true});
  }  

  render() {
    const { loading, error, currentTab, analysis } = this.state;
    return (
      <div>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6">
              Earthquake Visualization & Risk Mapping
            </Typography>
          </Toolbar>
        </AppBar>
        <Container style={{ marginTop: '20px' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">Error: {error}</Typography>
          ) : (
            <div>
              <Tabs value={currentTab} onChange={this.handleTabChange} centered>
                <Tab label="Real-time Earthquake Data" />
                <Tab label="Risk Analysis" />
              </Tabs>
              {currentTab === 0 && (
                <div id="map" style={{ width: '100%', height: '600px', marginTop: '20px' }}></div>
              )}
              {currentTab === 1 && (
                <div style={{ marginTop: '20px' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Risk Summary
                          </Typography>
                          <Typography variant="body1">
                            Average Magnitude: {analysis.average_magnitude}
                          </Typography>
                          <Typography variant="body1">
                            High-Risk Events (Magnitude ≥ 5.0): {analysis.high_risk_count}
                          </Typography>
                          <Typography variant="caption" display="block" gutterBottom>
                            Data Timestamp (UTC): {analysis.timestamp}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <div id="risk-plot" style={{ width: '100%', height: '600px' }}></div>
                    </Grid>
                  </Grid>
                </div>
              )}
            </div>
          )}
        </Container>
      </div>
    );
  }
}

ReactDOM.render(<EarthquakeApp />, document.getElementById('root'));
