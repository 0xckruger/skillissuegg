use anchor_lang::prelude::*;
use crate::errors::TicTacToeError;
use crate::instructions::EscrowAccount;
use crate::state::game::{TicTacToeGame, Tile};

pub fn play(ctx: Context<Play>, tile: Tile) -> Result<()> {
    let game = &mut ctx.accounts.game;

    require_keys_eq!(
        game.current_player(),
        ctx.accounts.player.key(),
        TicTacToeError::NotPlayersTurn
    );

    game.play(&tile)
}

#[derive(Accounts)]
pub struct Play<'info> {
    #[account(
        mut,
        seeds = [b"tictactoe".as_ref(), game.players[0].as_ref(), game.players[1].as_ref()],
        bump)]
    pub game: Account<'info, TicTacToeGame>,
    pub player: Signer<'info>,
}