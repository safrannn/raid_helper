#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
// (minute, seconds)
pub struct Time(usize, f32);

impl Time {
    pub fn new(minute: usize, second: f32) -> Self {
        Time(minute, second)
    }

    pub fn from_milliseconds(milliseconds: usize) -> Self {
        let mut seconds = (milliseconds as f32 / 1000.0).abs();
        if seconds < 60.0 {
            return Time(0, seconds);
        } else {
            let minutes = (seconds / 60.0).round().abs() as usize;
            seconds -= 60.0 * minutes as f32;
            return Time(minutes, seconds);
        }
    }
}

impl From<&str> for Time {
    fn from(time_string: &str) -> Self {
        time_string
            .split_once(":")
            .and_then(|(min, sec)| match (min.parse(), sec.parse()) {
                (Ok(min), Ok(sec)) => Some(Time(min, sec)),
                _ => None,
            })
            .unwrap_or_else(|| Time(0, 0.0))
    }
}
