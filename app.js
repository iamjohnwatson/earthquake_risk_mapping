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
      error: null,
      currentTab: 0,
      analysis: {
        average_magnitude: 0,
        high_risk_count: 0,
        timestamp: new Date().toISOString()
      }
    };
  }

  componentDidMount() {
    // Directly fetch real-time data from USGS
    const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
    fetch(USGS_URL)
      .then(response => response.json())
      .then(data => {
        const features = data.features || [];

        // Compute a basic risk analysis
        const magnitudes = features
          .map(feature => feature.properties.mag)
          .filter(mag => mag != null);
        const avgMag = magnitudes.length
          ? magnitudes.reduce((sum, m) => sum + m, 0) / magnitudes.length
          : 0;
        const highRisk = features.filter(f => f.properties.mag >= 5.0);

        this.setState({
          earthquakes: features,
          loading: false,
          analysis: {
            average_magnitude: avgMag.toFixed(2),
            high_risk_count: highRisk.length,
            timestamp: new Date().toISOString()
          }
        }, () => {
          // Render the default (map) tab
          this.renderMapPlot();
        });
      })
      .catch(error => {
        this.setState({ error: error.toString(), loading: false });
      });
  }

  componentDidUpdate(prevProps, prevState) {
    // Re-render the correct plot when switching tabs
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

  // Plot 1: Real-time Earthquake Map
  renderMapPlot() {
    const { earthquakes } = this.state;
    const lats = earthquakes.map(eq => eq.geometry.coordinates[1]);
    const lons = earthquakes.map(eq => eq.geometry.coordinates[0]);
    const mags = earthquakes.map(eq => eq.properties.mag);
    const texts = earthquakes.map(eq => 
      `Location: ${eq.properties.place}<br>Magnitude: ${eq.properties.mag}`
    );

    const data = [{
      type: 'scattergeo',
      lat: lats,
      lon: lons,
      hoverinfo: 'text',
      text: texts,
      marker: {
        size: mags.map(m => m * 4),
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
        landcolor: 'rgb(217, 217, 217)'
      },
      margin: { t: 50, b: 0, l: 0, r: 0 }
    };

    Plotly.newPlot('map', data, layout, { responsive: true });
  }

  // Plot 2: Risk Analysis by Location (Aggregated)
  renderRiskAnalysisMap() {
    const { earthquakes } = this.state;
    const locationData = {};

    earthquakes.forEach(eq => {
      const place = eq.properties.place || 'Unknown';
      // Extract region from the last comma if present
      let region = place;
      if (place.includes(',')) {
        const parts = place.split(',');
        region = parts[parts.length - 1].trim();
      }

      const coords = eq.geometry.coordinates; // [lon, lat, depth]
      const lat = coords[1];
      const lon = coords[0];
      const mag = eq.properties.mag;

      if (!locationData[region]) {
        locationData[region] = {
          count: 0,
          totalMag: 0,
          totalLat: 0,
          totalLon: 0
        };
      }

      if (mag != null) {
        locationData[region].count += 1;
        locationData[region].totalMag += mag;
        locationData[region].totalLat += lat;
        locationData[region].totalLon += lon;
      }
    });

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
      hoverText.push(
        `Region: ${region}<br>Events: ${count}<br>Avg Mag: ${avgMag.toFixed(2)}`
      );
    });

    const dataPlot = [{
      type: 'scattergeo',
      lat: avgLats,
      lon: avgLons,
      text: hoverText,
      hoverinfo: 'text',
      marker: {
        size: counts.map(c => Math.min(c * 3, 50)), // scale marker size
        color: avgMags,
        colorscale: 'Viridis',
        colorbar: { title: 'Avg Magnitude' },
        line: { color: 'black', width: 0.5 }
      }
    }];

    const layout = {
      title: 'Risk Analysis by Location (Aggregated)',
      geo: {
        scope: 'world',
        projection: { type: 'natural earth' },
        showland: true,
        landcolor: 'rgb(217, 217, 217)'
      },
      margin: { t: 50, b: 0, l: 0, r: 0 }
    };

    Plotly.newPlot('risk-plot', dataPlot, layout, { responsive: true });
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
                <div
                  id="map"
                  style={{ width: '100%', height: '600px', marginTop: '20px' }}
                />
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
                      <div
                        id="risk-plot"
                        style={{ width: '100%', height: '600px' }}
                      />
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
