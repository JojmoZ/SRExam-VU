fn main() {
    cynic_codegen::register_schema("TPAdesktop")
        .from_sdl_file("schemas/TPAdesktop.graphql")
        .unwrap()
        .as_default()
        .unwrap();
    

    tauri_build::build()
}
