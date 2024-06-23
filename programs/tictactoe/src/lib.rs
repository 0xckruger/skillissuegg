use anchor_lang::prelude::*;
use instructions::*;
use state::game::Tile;

pub mod errors;
pub mod instructions;
pub mod state;

declare_id!("39YeZsrCamsEh4rjrqGZ74iqEdUwSJAWZhdtkQdP6Tae");

#[program]
pub mod tictactoe {
    use super::*;

    pub fn setup_game(ctx: Context<SetupGame>) -> Result<()> {
        setup_game::setup_game(ctx)
    }

    pub fn play(ctx: Context<Play>, tile: Tile) -> Result<()> {
        play::play(ctx, tile)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        bet::deposit(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        bet::withdraw(ctx)
    }

    pub fn end_game(ctx: Context<EndGame>) -> Result<()> {
        end_game::end_game(ctx)
    }
}