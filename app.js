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
  Grid
} = MaterialUI;

class EarthquakeApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      earthquakes: [],
      analysis: {},
      error: null
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
          this.renderMap();
        });
      })
      .catch(error => {
        this.setState({ error: error.toString(), loading: false });
      });
  }

  renderMap() {
    // Prepare data arrays for Plotly map
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
        size: mags.map(m => m * 4),  // Scale marker sizes based on magnitude
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

  render() {
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
          {this.state.loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
              <CircularProgress />
            </Box>
          ) : this.state.error ? (
            <Typography color="error">Error: {this.state.error}</Typography>
          ) : (
            <div>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Risk Analysis
                      </Typography>
                      <Typography variant="body1">
                        Average Magnitude: {this.state.analysis.average_magnitude}
                      </Typography>
                      <Typography variant="body1">
                        High-Risk Events (Magnitude ≥ 5.0): {this.state.analysis.high_risk_count}
                      </Typography>
                      <Typography variant="caption" display="block" gutterBottom>
                        Data Timestamp (UTC): {this.state.analysis.timestamp}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={8}>
                  <div id="map"></div>
                </Grid>
              </Grid>
            </div>
          )}
        </Container>
      </div>
    );
  }
}

ReactDOM.render(<EarthquakeApp />, document.getElementById('root'));
