use std::{
    fs::File,
    io::{BufWriter, Write},
};

// write data to json file // todo!: update this into database later
pub fn write_to_json<TData>(output_path: String, data: &TData)
where
    TData: serde::ser::Serialize,
{
    let file = File::create(output_path).unwrap();
    let mut writer = BufWriter::new(file);
    let _ = serde_json::to_writer(&mut writer, data);
    let _ = writer.flush();
}
