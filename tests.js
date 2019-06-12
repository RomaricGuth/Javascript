// Tests unitaires pour le projet

suite("Tests du chargement des topics",
  function() { // la suite est mise en place via un callback
    const ids = get_ids();
    // Un premier test
    test("On vérifie le chargement des id des topics",
          function() { // fonction anonyme qui défini ce que le test va faire
          let defini = true;
          ids
          .then((res) => {
            res.forEach(id => {if (id == undefined) defini = false;});
            return res;
          })
          .then((res) => {
            chai.assert.isTrue(Array.isArray(res) && defini);
          });
          });

    // Un autre test
    const topics = get_topics_all();
    test("On vérifie le chargement des infos",
        function() {
          topics.then((res) => {
            chai.assert.exists(res[0].date);
            chai.assert.exists(res[0].id);
            chai.assert.exists(res[0].open);
            chai.assert.exists(res[0].topic);
            chai.assert.exists(res[0].user);
            chai.assert.exists(res[0].desc);
          });
        });
    test("On vérifie le chargement des posts", 
        function() {
          topics.then((res) => {
            chai.assert.exists(res[0].posts);
          });
        }
    );
  }
);

suite("Tests sur les tries",
  function(){
    const a = {"date" : "2019-02-12T12:32:37.466Z"};
    const b = {"date" : "2017-01-18T13:31:36.465Z"};
    test("tri dates croissantes",
      function() {
        chai.assert.isAbove(triDateCroissant(a,b),0); 
      }
    );
    test("tri dates décroissantes",
      function() {
        chai.assert.isBelow(triDateDecroissant(a,b),0); 
      }
    );
  }
);
