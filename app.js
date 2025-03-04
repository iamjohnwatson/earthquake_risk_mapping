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
      currentTab: 0, // 0: Real-time Data, 1: Predictive Risk
      historicalRiskData: null,
      predictiveRiskText: ""
    };
  }

  componentDidMount() {
    // Fetch real-time earthquake data (last day)
    const USGS_REALTIME = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
    fetch(USGS_REALTIME)
      .then(response => response.json())
      .then(data => {
        const features = data.features || [];
        this.setState({
          earthquakes: features,
          loading: false
        }, () => {
          if (this.state.currentTab === 0) this.renderMapPlot();
        });
      })
      .catch(error => this.setState({ error: error.toString(), loading: false }));
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.currentTab !== this.state.currentTab) {
      if (this.state.currentTab === 0) {
        this.renderMapPlot();
      } else if (this.state.currentTab === 1) {
        // For predictive risk, fetch historical data if not already done
        if (!this.state.historicalRiskData) {
          this.fetchHistoricalRiskData();
        } else {
          this.renderPredictiveRiskMap();
        }
      }
    }
  }

  handleTabChange = (event, newValue) => {
    this.setState({ currentTab: newValue });
  };

  // ----------------------------
  // Tab 0: Real-time Earthquake Map
  // ----------------------------
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
        colorbar: { title: 'Magnitude' },
        line: { color: 'black', width: 0.5 }
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

  // ----------------------------
  // Tab 1: Predictive Risk (historical data)
  // ----------------------------
  fetchHistoricalRiskData() {
    const USGS_HISTORICAL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson';
    fetch(USGS_HISTORICAL)
      .then(response => response.json())
      .then(data => {
        const features = data.features || [];
        let aggregated = {};
        // Consider only events with magnitude ≥ 5.0
        features.forEach(eq => {
          if (eq.properties.mag >= 5.0) {
            let place = eq.properties.place || "Unknown";
            let region = place.includes(',') ? place.split(',').pop().trim() : place;
            const [lon, lat] = eq.geometry.coordinates;
            const mag = eq.properties.mag;
            if (!aggregated[region]) {
              aggregated[region] = { count: 0, totalMag: 0, totalLat: 0, totalLon: 0 };
            }
            aggregated[region].count += 1;
            aggregated[region].totalMag += mag;
            aggregated[region].totalLat += lat;
            aggregated[region].totalLon += lon;
          }
        });
        // Convert aggregated object into an array
        const aggArray = Object.keys(aggregated).map(region => {
          const d = aggregated[region];
          return {
            region,
            count: d.count,
            avgMag: d.count > 0 ? d.totalMag / d.count : 0,
            avgLat: d.count > 0 ? d.totalLat / d.count : 0,
            avgLon: d.count > 0 ? d.totalLon / d.count : 0
          };
        });
        this.setState({ historicalRiskData: aggArray }, () => {
          this.renderPredictiveRiskMap();
          this.generatePredictiveRiskText();
        });
      })
      .catch(error => this.setState({ error: error.toString() }));
  }

  renderPredictiveRiskMap() {
    const { historicalRiskData } = this.state;
    if (!historicalRiskData) return;
    const counts = historicalRiskData.map(d => d.count);
    const avgLats = historicalRiskData.map(d => d.avgLat);
    const avgLons = historicalRiskData.map(d => d.avgLon);
    const avgMags = historicalRiskData.map(d => d.avgMag);
    const hoverText = historicalRiskData.map(d =>
      `Region: ${d.region}<br>High Mag Events: ${d.count}<br>Avg Mag: ${d.avgMag.toFixed(2)}`
    );
    const dataPlot = [{
      type: 'scattergeo',
      lat: avgLats,
      lon: avgLons,
      text: hoverText,
      hoverinfo: 'text',
      marker: {
        size: counts.map(c => Math.min(c * 4, 50)),
        color: avgMags,
        colorscale: 'Viridis',
        colorbar: { title: 'Avg Magnitude' },
        line: { color: 'black', width: 0.5 }
      }
    }];
    const layout = {
      title: 'Predictive Risk Analysis (Historical Data)',
      geo: { 
        scope: 'world', 
        projection: { type: 'natural earth' }, 
        showland: true, 
        landcolor: 'rgb(217, 217, 217)' 
      },
      margin: { t: 50, b: 0, l: 0, r: 0 }
    };
    Plotly.newPlot('predictive-map', dataPlot, layout, { responsive: true });
  }

  // Generate a 50-word dynamic predictive risk text
  generatePredictiveRiskText() {
    const { historicalRiskData } = this.state;
    if (!historicalRiskData || historicalRiskData.length === 0) {
      this.setState({ predictiveRiskText: "Insufficient historical data available to generate predictive risk analysis at this time." });
      return;
    }
    // Sort regions by count descending and take top 3
    const sorted = historicalRiskData.sort((a, b) => b.count - a.count);
    const top = sorted.slice(0, 3);
    const region1 = top[0] ? top[0].region : "N/A";
    const count1 = top[0] ? top[0].count : "0";
    const region2 = top[1] ? top[1].region : "N/A";
    const count2 = top[1] ? top[1].count : "0";
    const region3 = top[2] ? top[2].region : "N/A";
    const count3 = top[2] ? top[2].count : "0";
    // 50-word predictive risk text template
    const text =
      `Historical data from the past month indicates that the regions of ${region1} (with ${count1} high magnitude events), ${region2} (with ${count2} events), and ${region3} (with ${count3} events) are at elevated risk for severe seismic activity. This statistical trend suggests a higher probability of future earthquakes; therefore, rigorous monitoring is strongly advised.`;
    this.setState({ predictiveRiskText: text });
  }

  render() {
    const { loading, error, currentTab, predictiveRiskText } = this.state;
    return (
      <div>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6">
              Earthquake Visualization & Predictive Risk Mapping
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
                <Tab label="Real-time Data" />
                <Tab label="Predictive Risk" />
              </Tabs>

              {currentTab === 0 && (
                <div id="map" style={{ width: '100%', height: '600px', marginTop: '20px' }} />
              )}

              {currentTab === 1 && (
                <div style={{ marginTop: '20px' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <div id="predictive-map" style={{ width: '100%', height: '600px' }} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Predictive Risk Analysis
                          </Typography>
                          <Typography variant="body2">
                            {predictiveRiskText}
                          </Typography>
                        </CardContent>
                      </Card>
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
