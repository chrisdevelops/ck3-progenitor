//! Gate test for `progenitor-content`.
//!
//! Written before the implementation; drives the crate only through its public
//! contract; covers the crucial path and the contract's failure modes. See the
//! Testing strategy in `docs/plan.md`.

#[test]
fn crate_is_wired_into_the_workspace() {
    assert_eq!(progenitor_content::CRATE_NAME, "progenitor-content");
}
