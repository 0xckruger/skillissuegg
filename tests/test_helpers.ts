import chai from 'chai';

function approximatelyEqual(precision: number = 5) {
    return function(this: any, expected: number) {
        const actual = this._obj;
        const multiplier = Math.pow(10, precision);
        const actualRounded = Math.round(actual * multiplier);
        const expectedRounded = Math.round(expected * multiplier);

        this.assert(
            actualRounded === expectedRounded,
            `expected #{this} to be approximately equal to ${expected} up to ${precision} decimal places`,
            `expected #{this} to not be approximately equal to ${expected} up to ${precision} decimal places`,
            expected,
            actual
        );
    };
}

chai.use(function(chai, utils) {
    chai.Assertion.addMethod('approximatelyEqual', approximatelyEqual);
});



// Extend the Chai typings
declare global {
    namespace Chai {
        interface Assertion {
            approximatelyEqual(expected: number, precision?: number): void;
        }
    }
}