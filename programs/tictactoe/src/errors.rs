use anchor_lang::error_code;

#[error_code]
pub enum TicTacToeError {
    #[msg("Tile coordinates are out of bounds")]
    TileOutOfBounds,
    #[msg("Tile has already been played")]
    TileAlreadySet,
    #[msg("Game is already over")]
    GameAlreadyOver,
    #[msg("It's not this player's turn")]
    NotPlayersTurn,
    #[msg("Game has already started")]
    GameAlreadyStarted,
    #[msg("Game is currently in play")]
    GameNotOver
}