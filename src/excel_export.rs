use crate::image_info::BatchImageInfo;
use anyhow::{Context, Result};
use csv::Writer;
use serde::Serialize;
use std::fs::File;
use std::path::Path;

#[derive(Serialize)]
struct ImageRecord {
    filename: String,
    pixel_width: u32,
    pixel_height: u32,
    physical_width: f64,
    physical_height: f64,
    dpi_x: u32,
    dpi_y: u32,
    color_mode: String,
    file_size: u64,
    file_size_str: String,
    status: String,
    error: Option<String>,
}

pub fn export_to_excel<P: AsRef<Path>>(
    batch_info: &BatchImageInfo,
    output_path: P,
) -> Result<()> {
    let output_path = output_path.as_ref();
    
    // 创建CSV写入器
    let file = File::create(output_path).context("创建文件失败")?;
    let mut wtr = Writer::from_writer(file);
    
    // 写入表头
    wtr.write_record(&[
        "文件名",
        "像素宽度",
        "像素高度", 
        "物理宽度(cm)",
        "物理高度(cm)",
        "DPI X",
        "DPI Y",
        "色彩模式",
        "文件大小(字节)",
        "文件大小(可读)",
        "状态",
        "错误信息"
    ]).context("写入表头失败")?;
    
    // 写入数据
    for image_info in &batch_info.images {
        let record = ImageRecord {
            filename: image_info.file_name.clone(),
            pixel_width: image_info.pixel_size.0,
            pixel_height: image_info.pixel_size.1,
            physical_width: image_info.physical_size.0,
            physical_height: image_info.physical_size.1,
            dpi_x: image_info.dpi.0,
            dpi_y: image_info.dpi.1,
            color_mode: image_info.color_mode.clone(),
            file_size: image_info.file_size,
            file_size_str: image_info.file_size_str(),
            status: if image_info.error.is_some() { "错误".to_string() } else { "正常".to_string() },
            error: image_info.error.clone(),
        };
        
        wtr.serialize(record).context("写入记录失败")?;
    }
    
    // 写入汇总信息
    wtr.write_record(&["汇总信息", "", "", "", "", "", "", "", "", "", "", ""])
        .context("写入汇总标题失败")?;
    wtr.write_record(&["总图片数", &batch_info.total_count.to_string(), "", "", "", "", "", "", "", "", "", ""])
        .context("写入总图片数失败")?;
    wtr.write_record(&["成功读取", &batch_info.success_count.to_string(), "", "", "", "", "", "", "", "", "", ""])
        .context("写入成功数失败")?;
    wtr.write_record(&["读取失败", &batch_info.error_count.to_string(), "", "", "", "", "", "", "", "", "", ""])
        .context("写入失败数失败")?;
    
    wtr.flush().context("刷新写入器失败")?;
    
    Ok(())
}

pub fn generate_report_filename<P: AsRef<Path>>(folder_path: P) -> String {
    let folder_path = folder_path.as_ref();
    let folder_name = folder_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("图片");
    
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    
    format!("{}_报告_{}.csv", folder_name, timestamp)
}