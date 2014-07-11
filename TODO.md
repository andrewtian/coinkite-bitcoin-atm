
- SMS and pubkeys are not validated.

- should not be able to deposit cash until destination is fully validated, and should not
    be able to go back, since might be no way to "eject" deposit.

- would be nice to make a pubkey validator directive for angular
  <http://www.benlesh.com/2012/12/angular-js-custom-validation-via.html>
    - should decode base58 and check the checksum (last 4 chars)
    - but best if it does not validate prefix. then useful for all sorts of entries.
    - bitcoinjs has this code, but all broken up into 3 packages, and raises assertions


