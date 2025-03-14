#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
// seconds
pub struct Time(f32);

impl Time {
    pub fn new( second: f32) -> Self {
        Time(second)
    }

    pub fn from_milliseconds(milliseconds: usize) -> Self {
        let seconds: f32 = (milliseconds as f32/ 1000.0).abs();
        return Time(seconds);
    }

    pub fn get_sec(&self) -> f32 {
        return self.0;
    }
}

impl From<&str> for Time {
    fn from(time_string: &str) -> Self {
        time_string
            .split_once(":")
            .and_then(|(min, sec)| match (min.parse::<f32>(), sec.parse::<f32>()) {
                (Ok(min), Ok(sec)) => Some(Time(min*60.0+sec)),
                _ => None,
            })
            .unwrap_or_else(|| Time(0.0))
    }
}
