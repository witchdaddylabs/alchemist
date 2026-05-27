use std::path::Path;

use crate::errors::AppError;
use crate::models::{
    MemPalaceStructure, RoomStructure, DrawerStructure, WingStructure,
};

/// Parse a MemPalace YAML config file and return its structure.
/// The YAML format is a wing/room/drawer hierarchy:
///
/// ```yaml
/// wings:
///   wing_name:
///     path: /path/to/source
///     rooms:
///       room_name:
///         keywords: [tag1, tag2]
///         entities: [Entity1, Entity2]
///         drawers:
///           - name: drawer_name
///             keywords: [tag3]
/// ```
pub fn parse_palace_yaml(path: &str) -> Result<MemPalaceStructure, AppError> {
    let p = Path::new(path);
    if !p.exists() {
        return Err(AppError::NotFound(format!(
            "MemPalace config not found: {}",
            path
        )));
    }

    let content = std::fs::read_to_string(path)?;

    // Try to parse as the full MemPalace YAML format
    // The MemPalace config can be either a flat YAML with `wings:` or
    // a nested structure from the palace config
    let yaml_value: serde_yaml::Value = serde_yaml::from_str(&content)?;

    // Normalise: if the root has a "wings" key, use that
    // Otherwise try the file as a palace.yaml (top-level a list of wings or a map)
    let wings_raw = if let Some(wings_map) = yaml_value.get("wings") {
        wings_map
    } else {
        // Try treating the entire document as the wings map
        &yaml_value
    };

    let mut wings = Vec::new();

    if let Some(mapping) = wings_raw.as_mapping() {
        for (wing_name, wing_value) in mapping {
            let wing_name_str = wing_name
                .as_str()
                .unwrap_or("unnamed_wing")
                .to_string();

            let wing_path = wing_value
                .get("path")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let mut rooms = Vec::new();

            if let Some(rooms_raw) = wing_value.get("rooms") {
                if let Some(rooms_map) = rooms_raw.as_mapping() {
                    for (room_name, room_value) in rooms_map {
                        let room_name_str = room_name
                            .as_str()
                            .unwrap_or("unnamed_room")
                            .to_string();

                        let room_keywords: Vec<String> = room_value
                            .get("keywords")
                            .and_then(|v| v.as_sequence())
                            .map(|seq| {
                                seq.iter()
                                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                    .collect()
                            })
                            .unwrap_or_default();

                        let room_entities: Vec<String> = room_value
                            .get("entities")
                            .and_then(|v| v.as_sequence())
                            .map(|seq| {
                                seq.iter()
                                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                    .collect()
                            })
                            .unwrap_or_default();

                        let mut drawers = Vec::new();

                        if let Some(drawers_raw) = room_value.get("drawers") {
                            if let Some(drawers_seq) = drawers_raw.as_sequence() {
                                for drawer_value in drawers_seq {
                                    let drawer_name = drawer_value
                                        .get("name")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("unnamed_drawer")
                                        .to_string();

                                    let drawer_keywords: Vec<String> = drawer_value
                                        .get("keywords")
                                        .and_then(|v| v.as_sequence())
                                        .map(|seq| {
                                            seq.iter()
                                                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                                .collect()
                                        })
                                        .unwrap_or_default();

                                    let drawer_descriptions: Vec<String> = drawer_value
                                        .get("descriptions")
                                        .and_then(|v| v.as_sequence())
                                        .map(|seq| {
                                            seq.iter()
                                                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                                .collect()
                                        })
                                        .unwrap_or_default();

                                    let drawer_entities: Vec<String> = drawer_value
                                        .get("entities")
                                        .and_then(|v| v.as_sequence())
                                        .map(|seq| {
                                            seq.iter()
                                                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                                .collect()
                                        })
                                        .unwrap_or_default();

                                    drawers.push(DrawerStructure {
                                        name: drawer_name,
                                        keywords: drawer_keywords,
                                        descriptions: drawer_descriptions,
                                        entities: drawer_entities,
                                        drawer_count: None,
                                    });
                                }
                            }
                        }

                        // Count drawers if not explicitly listed
                        let drawer_count = room_value
                            .get("drawer_count")
                            .and_then(|v| v.as_i64())
                            .map(|c| c as usize);

                        rooms.push(RoomStructure {
                            name: room_name_str,
                            keywords: room_keywords,
                            entities: room_entities,
                            drawers,
                            drawer_count,
                        });
                    }
                }
            }

            // Count rooms
            let room_count = rooms.len();

            wings.push(WingStructure {
                name: wing_name_str,
                path: wing_path,
                rooms,
                room_count: Some(room_count),
            });
        }
    }

    // Extract global metadata
    let total_wings = wings.len();
    let total_rooms: usize = wings.iter().map(|w| w.rooms.len()).sum();
    let total_drawers: usize = wings
        .iter()
        .flat_map(|w| w.rooms.iter())
        .map(|r| r.drawers.len())
        .sum();

    Ok(MemPalaceStructure {
        wings,
        total_wings,
        total_rooms,
        total_drawers,
        source_file: p.to_string_lossy().to_string(),
    })
}

/// Discover and parse a MemPalace config by searching common locations.
/// Tries: explicit path → ~/.mempalace/mempalace.yaml → ~/.mempalace/config.yaml
pub fn discover_and_parse(path: Option<&str>) -> Result<MemPalaceStructure, AppError> {
    if let Some(p) = path {
        if !p.is_empty() {
            return parse_palace_yaml(p);
        }
    }

    // Try default locations
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/habibi".to_string());
    let candidates = vec![
        format!("{}/.mempalace/mempalace.yaml", home),
        format!("{}/.mempalace/config.yaml", home),
        format!("{}/.mempalace/config.yml", home),
        format!("{}/.mempalace/palace.yaml", home),
        format!("{}/.mempalace/palace.yml", home),
    ];

    for candidate in &candidates {
        if Path::new(candidate).exists() {
            return parse_palace_yaml(candidate);
        }
    }

    Err(AppError::NotFound(
        "No MemPalace config found in ~/.mempalace/ or at the given path".to_string(),
    ))
}
