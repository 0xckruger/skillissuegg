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
    GameNotOver,
    #[msg("Unauthorized user")]
    UnauthorizedUser,
    #[msg("Deposited amounts do not match")]
    AmountMismatch,
    #[msg("Invalid player one account")]
    InvalidPlayerOne,
    #[msg("Invalid player two account")]
    InvalidPlayerTwo,
    #[msg("Escrow account is already initialized")]
    EscrowAlreadyInitialized,
    #[msg("Escrow account is not initialized")]
    EscrowNotInitialized,
    #[msg("Escrowed funds still present, please withdraw")]
    EscrowFundsPresent
}