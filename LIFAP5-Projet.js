"use strict";
/* eslint-disable no-console */
/* exported whoami echo*/

////////////////////////////////////////////////////////////////////////////////
// CONSTANTES / CONFIGURATION
////////////////////////////////////////////////////////////////////////////////
const local_server = "https://localhost:8443/";
const lifap5_server = "https://lifap5.univ-lyon1.fr/";
const server = lifap5_server || local_server;

const local_todos = "./Projet-2019-topics.json";
const local_users = "./Projet-2019-users.json";

const content_type_header = "Content-Type";
const content_type_value = "application/json";
const x_api_key_header = "x-api-key"; 
const my_api_key = "c0507482-a703-535e-be6d-d2903efc03fe";

////////////////////////////////////////////////////////////////////////////////
// ETAT : classe pour gérer l'état courant de l'application
////////////////////////////////////////////////////////////////////////////////
function State(users = [], topics = [], filters = [], sortTopics = "DateDesc", sortContrib = "Date", x_api_key = my_api_key){
  // vous êtes libres d'adapter cette classe avec d'autres paramètres pour refléter l'état courant
  this.users      = users;
  this.topics     = topics;
  this.filters    = filters;
  this.sortTopics = sortTopics;
  this.sortContrib=sortContrib;
  this.idTopic    = "";
  this.x_api_key  = x_api_key;
  this.login      = "11711434";
}//end State

////////////////////////////////////////////////////////////////////////////////
// OUTILS : fonctions outils, manipulation et filtrage de TODOs
////////////////////////////////////////////////////////////////////////////////

//supprimer tous les handlers (et ceux de ses enfants) en clonant un élément
function clearEventListenerById(id){
  let elt = document.getElementById(id);
  let clone = elt.cloneNode(true);
  elt.parentNode.replaceChild(clone, elt);
  return id;
}

// renvoie la date à laquelle a été posté la dernière contribution
function dateDernierPost(topic) {
  if (topic.posts.length > 0) {
    const posts = topic.posts.sort(triDateDecroissant);
    return posts[0].date;
  }
  return "";
}

//renvoie l'index du champ ayant l'id passé en paramètre
function indexId(data, id) {
  for(var i=0;i<data.length;i++) {
    if (data[i]._id == id) return i;
  }
  return -1;
}

////////////////////////////////////////////////////////////////////////////////
// RENDU : fonctions génération de HTML à partir des données JSON
////////////////////////////////////////////////////////////////////////////////


function setListeTopics (state) {
  const topics = triTopics(state)
    .map(data => 
      `<div class="row" id="${data._id}">
        <div class="col-5">${data.topic}</div>
        <div class="col-3">${dateDernierPost(data).slice(0,10)}</div>
        <div class="col-1">${data.posts.length}</div>
        <div class="col-3">${data.date.slice(0,10)}</div>
      </div>`)
    .reduce((acc, topic) => acc + topic, "");
  document.getElementById("table-topics-body").innerHTML = topics;
  return attach_topics_handlers(state);
}



function afficheTopic(state) {
  const topic = state.topics[indexId(state.topics, state.idTopic)];
  const posts = triPosts(topic.posts, state.sortContrib).map((post) => 
  `<div>
    <a href="#">${post.user}</a> le ${post.date.slice(0,10)} 
    (${post.likers.length} <i id="like${post._id}" class="far fa-thumbs-up"></i>)
    (${post.dislikers.length} <i id="dislike${post._id}" class="far fa-thumbs-down"></i>)
    ${post.user == state.login ? `<a href="#" id = "suppr${post._id}">Supprimer</a>` : ""}  
    <p class="speech-bubble">${post.content}</p>
  </div>`)
  .reduce((acc, e) => acc + e,"");

  document.getElementById("topic").innerHTML =
        `<h2 class="text-center">${topic.topic}</h2>
        <div id="panel-contribs">

          <ul id="contrib-description" class="list-group">
            <li class="list-group-item">Proposé par : <a href="#">${topic.user}</a></li>
            <li class="list-group-item">Proposé le : ${topic.date.slice(0,10)} à ${topic.date.slice(11,16)}</li>
            <li class="list-group-item">Description : ${topic.desc}</li>
            <li class="list-group-item">Trier les posts par : 
              <select id="sortContrib">
                <option value="Date" ${state.sortContrib.slice(0,4) == "Date" ? "selected" : ""}>Date d'ajout </option>
                <option value="Likes" ${state.sortContrib.slice(0,5) == "Likes" ? "selected" : ""}>Likes</option>
                <option value="Dislikes" ${state.sortContrib.slice(0,8) == "Dislikes" ? "selected" : ""}>Dislikes</option>                
                <option value="User" ${state.sortContrib.slice(0,4) == "User" ? "selected" : ""}>Utilisateurs</option>
              </select>
              <button id="inverseContrib">Inverser l'ordre</button>
            </li>
          </ul>
        </hr>
          <div id="contrib-list" class="container-fluid"> 
              ${posts}
          </div>
        </div>`;
  return attach_posts_handlers(state);
}


////////////////////////////////////////////////////////////////////////////////
// HANDLERS : gestion des évenements de l'utilisateur dans l'interface HTML
////////////////////////////////////////////////////////////////////////////////
function attach_all_handlers(state){

  //on commence par tout vider
  let ids = [
    "identification-link",
    "search-btn",
    "upload-btn",
    "contrib-btn",
    "triSujet",
    "triDate",
    "triContribs",
    "triMaj"
  ];
  ids.map(clearEventListenerById);


  // /!\ WARNING api_key_value est une VARIABLE GLOBALE /!\
  document.getElementById("identification-link")
  .addEventListener("click", () => {
    // on modifie l'état
    state.x_api_key = prompt("Saisissez votre clef d'API");
    whoami(state)()
    .then(data => {
      document.getElementById("identification-link").innerHTML = data.login;
      state.login = data.login; 
      alert(`Bienvenue ${data.login}`);    
    })
    .catch(alert);

    //on réattache les handlers pour qu'ils utilisent tous le nouvel état
    return attach_all_handlers(state);
  }); 

  document.getElementById("search-btn")
  .addEventListener("click", () => alert(document.getElementById("search-text").value));

  document.getElementById("upload-btn")
  .addEventListener("click", () => {
    (ajoutSujet(state))
    .then(attach_all_handlers)
    .then(setListeTopics);
  });
  
  document.getElementById("contrib-btn")
  .addEventListener("click", () => {
    if (state.idTopic == "") {
      alert("veuillez selectionner un topic");
    }
    else if (state.x_api_key == "") {
      alert("Vous devez vous authentifier pour poster");
    }
    else {
      ajoutPost(state)
      .then(attach_all_handlers)
      .then(setListeTopics)
      .then(afficheTopic)
    }
  });

  document.getElementById("triSujet").addEventListener("click", () => {
    if (state.sortTopics == "Titre") state.sortTopics = "TitreDesc";
    else state.sortTopics = "Titre";
    setListeTopics(state);
  });
  document.getElementById("triDate").addEventListener("click", () => {
    if (state.sortTopics == "Date") state.sortTopics = "DateDesc";
    else state.sortTopics = "Date";
    setListeTopics(state);
  });
  document.getElementById("triContribs").addEventListener("click", () => {
    if (state.sortTopics == "Contribs") state.sortTopics = "ContribsDesc";
    else state.sortTopics = "Contribs";
    setListeTopics(state);
  });
  document.getElementById("triMaj").addEventListener("click", () => {
    if (state.sortTopics == "Maj") state.sortTopics = "MajDesc";
    else state.sortTopics = "Maj";
    setListeTopics(state);
  });

  // renvoie l'état pour pouvoir être chainée
  return state;
}

function attach_topics_handlers(state) {
  let ids = [];
  state.topics.forEach(topic => ids.push(topic._id));
  ids.map(clearEventListenerById);

  state.topics.forEach(topic => {
    document.getElementById(topic._id).addEventListener("click", () => {
      state.idTopic = topic._id;
      afficheTopic(state);
    });
  });
  return state;
}

function attach_posts_handlers(state) {
  // recuperation du topic actuel
  const topic = state.topics[indexId(state.topics, state.idTopic)];
  // ménage
  let ids = ["sortContrib", "inverseContrib"];
  topic.posts.forEach(post => {
    ids.push(`like${post._id}`);
    ids.push(`dislike${post._id}`);
    if (post.user == state.login) ids.push(`suppr${post._id}`);
  });
  ids.map(clearEventListenerById);

  // pour les tris
  document.getElementById("sortContrib").addEventListener("change", () => afficheTopic(changeTriPosts(state)));
  document.getElementById("inverseContrib").addEventListener("click", () => afficheTopic(inverseTriPosts(state)));

  // pour chaque post :
  topic.posts.forEach(post => {
    // boutons likes
    document.getElementById(`like${post._id}`).addEventListener("click", () => {
      like(state,post._id)
      .then(afficheTopic);
    });
    // bouttons dislike
    document.getElementById(`dislike${post._id}`).addEventListener("click", () => {
      dislike(state,post._id)
      .then(afficheTopic);
    });
    // bouttons supprimer 
    if (post.user == state.login) {
      document.getElementById(`suppr${post._id}`).addEventListener("click", () => {
        supprimerPost(state,post._id)
        .then(attach_all_handlers)
        .then(setListeTopics)
        .then(afficheTopic);
      });
    }
  });
  return state;
}

//////////////////////////////////////////////////
// GESTION DES TRIS
//////////////////////////////////////////////////

// tri en fonction du tri demandé dans l'état
function triTopics(state) {
  switch(state.sortTopics) {
    case "Date":
      return state.topics.sort(triDateCroissant);
    case "DateDesc":
      return state.topics.sort(triDateDecroissant);
    case "Titre":
      return state.topics.sort(triTitreCroissant);
    case "TitreDesc":
      return state.topics.sort(triTitreDecroissant);
    case "Contribs":
      return state.topics.sort(triContribsCroissant);
    case "ContribsDesc":
      return state.topics.sort(triContribsDecroissant);
    case "Maj":
      return state.topics.sort(triMajCroissant);
    case "MajDesc":
      return state.topics.sort(triMajDecroissant);
  }
}

// même chose pour le posts
function triPosts(posts, tri) {
  switch (tri) {
    case "Date":
      return posts.sort(triDateCroissant);
    case "DateDesc":
      return posts.sort(triDateDecroissant);
    case "Likes":
      return posts.sort(triLikesCroissant);
    case "LikesDesc":
      return posts.sort(triLikesDecroissant);
    case "Dislikes":
      return posts.sort(triDislikesCroissant);
    case "DislikesDesc":
      return posts.sort(triDislikesDecroissant);
    case "User":
      return posts.sort(triUserCroissant);
    case "UserDesc":
      return posts.sort(triUserDecroissant);
  }
}

// mets à jour l'état avec la valeur de la liste déroulante pour le choix de tri
function changeTriPosts(state) {
  state.sortContrib = document.getElementById("sortContrib").value;
  return state;
}

// inverse l'ordre de tri 
function inverseTriPosts(state) {
  if (state.sortContrib.slice(-4) == "Desc") 
    state.sortContrib = state.sortContrib.slice(0,-4);
  else 
    state.sortContrib += "Desc";
  return state;
}

///////////////////////////////////////////////
// FONCTIONS UTILISEES PAR SORT
///////////////////////////////////////////////


function triDateCroissant (a, b) {
  // gestion des dates nulles pour le tri par dernière contribution
  if(a.date == "") return -1;
  if(b.date == "") return 1;
  //ANNEE
  if (parseInt(a.date.slice(0,4)) - parseInt(b.date.slice(0,4)) != 0) 
    return parseInt(a.date.slice(5,7)) - parseInt(b.date.slice(5,7));
  //MOIS
  if (parseInt(a.date.slice(5,7)) - parseInt(b.date.slice(5,7)) != 0)
    return parseInt(a.date.slice(5,7)) - parseInt(b.date.slice(5,7));
  //JOUR
  if (parseInt(a.date.slice(8,10)) - parseInt(b.date.slice(8,10)) != 0)
    return parseInt(a.date.slice(8,10)) - parseInt(b.date.slice(8,10));
  //HEURE
  if (parseInt(a.date.slice(11,13)) - parseInt(b.date.slice(11,13)) != 0)
    return parseInt(a.date.slice(11,13)) - parseInt(b.date.slice(11,13));
  //MINUTE
  if (parseInt(a.date.slice(14,16)) - parseInt(b.date.slice(14,16)) != 0)
    return parseInt(a.date.slice(14,16)) - parseInt(b.date.slice(14,16));
  //SECONDES
  if (parseInt(a.date.slice(17,19)) - parseInt(b.date.slice(17,19)) != 0)
    return parseInt(a.date.slice(17,19)) - parseInt(b.date.slice(17,19));
  //MILLIEMES
  if (parseInt(a.date.slice(20,23)) - parseInt(b.date.slice(20,23)) != 0)
    return parseInt(a.date.slice(20,23)) - parseInt(b.date.slice(20,23));
  return 0;
}

function triDateDecroissant (a, b) {
  return -triDateCroissant(a, b);
}

function triTitreCroissant (a, b) {
  return a.topic.localeCompare(b.topic);
}

function triTitreDecroissant (a, b) {
  return -triTitreCroissant(a, b);
}

function triContribsCroissant(a, b) {
  return a.posts.length - b.posts.length;
}

function triContribsDecroissant(a, b) {
  return - triContribsCroissant(a, b);
}

function triMajCroissant(a, b) {
  // on récupère la dernière date pour les 2 posts puis on tri comme pour les dates
  const newA = {"date":dateDernierPost(a)};
  const newB = {"date":dateDernierPost(b)};
  return triDateCroissant(newA,newB);
}

function triMajDecroissant(a, b) {
  return -triMajCroissant(a,b);
}

function triLikesCroissant(a, b) {
  return a.likers.length - b.likers.length;
}

function triLikesDecroissant(a, b) {
  return - triLikesCroissant(a, b);
}

function triDislikesCroissant(a, b) {
  return a.dislikers.length - b.dislikers.length;
}

function triDislikesDecroissant(a, b) {
  return - triDislikesCroissant(a, b);
}

function triUserCroissant (a, b) {
  return a.user.localeCompare(b.user);
}

function triUserDecroissant (a, b) {
  return -triUserCroissant(a, b);
}




////////////////////////////////////////////////////////////////////////////////
// FETCH Fonction permettant de charger des données asynchrones
////////////////////////////////////////////////////////////////////////////////
const get_ids = () => {
  let url = server + "topics/";
  let response_ok = false;

  let headers = new Headers();
  headers.set(content_type_header, content_type_value);

  return fetch(url, { method: "GET", headers:headers}) // récupération des ID des topics
    .then(response => {
      response_ok= response.ok;
      return response.json();
    })
    .then(ids => {    // verif
      if (response_ok) {
        return ids.map(id => id._id);
      } else {
        throw(new Error(`Erreur dans la requête ${url}: ${JSON.stringify(ids)}`));
      }
    }); 
}


const get_infos = (id) => {
  const url = server + `topic/${id}/`;
  let headers = new Headers();
  headers.set(content_type_header, content_type_value);
  let response_ok = false;

  return fetch(url, { method : "GET", headers:headers})  // recuperation des infos
    .then(response => {
      response_ok= response.ok;
      return response.json();
    })
    .then(infos => {
      if (response_ok) {  // verif
        return infos;
      } else {
        throw(new Error(`Erreur dans la requête ${url} /:${id}: ${JSON.stringify(infos)}`));
      }
    });
}


const get_posts = (id) => {
  const url = server + `topic/${id}/posts/`;
  let headers = new Headers();
  headers.set(content_type_header, content_type_value);
  let response_ok = false;

  return fetch(url, { method : "GET", headers:headers})  // recuperation des posts
    .then(response => {
      response_ok= response.ok;
      return response.json();
    })
    .then(posts => {
      if (response_ok) {  // verif
        return posts;
      } else {
        throw(new Error(`Erreur dans la requête ${url} /:${id}: ${JSON.stringify(posts)}`));
      }
    });
}


const get_topics_all = () => {
  return get_ids()
    .then(ids => ids.map(id => 
      get_infos(id)
      .then(topic => get_posts(id)
                    .then(posts => {
                      topic.posts = posts;
                      return topic;
                    })
      )
    ))
    .then(topics => Promise.all(topics));
}

const get_logins = () => {
  let url = server + "users/";
  let response_ok = false;

  let headers = new Headers();
  headers.set(content_type_header, content_type_value);

  return fetch(url, { method: "GET", headers:headers}) // récupération des logins des utilisateurs
    .then(response => {
      response_ok= response.ok;
      return response.json();
    })
    .then(logins => {    // verif
      if (response_ok) {
        return logins.map(logins => logins.login);
      } else {
        throw(new Error(`Erreur dans la requête ${url}: ${JSON.stringify(logins)}`));
      }
    }); 
}

const get_user = (login) => {
  const url = server + `user/${login}`;
  let headers = new Headers();
  headers.set(content_type_header, content_type_value);
  let response_ok = false;

  return fetch(url, { method : "GET", headers:headers})  // recuperation de l'utilisateur
    .then(response => {
      response_ok= response.ok;
      return response.json();
    })
    .then(user => {
      if (response_ok) {  // verif
        return user;
      } else {
        throw(new Error(`Erreur dans la requête ${url} : ${JSON.stringify(user)}`));
      }
    });
}

const get_users_all = () => {
  return get_logins()
    .then(logins => logins.map(login => get_user(login)))
    .then(Promise.all);
}

const whoami = (state) => () => {
  const url = server + "user/whoami";
  let headers = new Headers();
  headers.set(x_api_key_header, state.x_api_key);
  headers.set(content_type_header, content_type_value);

  let response_ok = false;

  //response.json() renvoie une promesse du corps de la réponse HTTP parsé en json
  // si la requête a réussi (response.ok) elle contient les informations de l'utilisateur authentifié avec sa clef x-api-key
  // sinon (!response.ok) la requête contient un code et une message d'erreur en JSON
  return fetch(url, { method: "GET", headers: headers })
  
  .then(response => {
    response_ok= response.ok;
    return response.json();
  })
  .then(data => {
    if (response_ok) {
      return data;
    } else {
      throw(new Error(`Erreur dans la requête ${url}: ${JSON.stringify(data)}`));
    }
  });
};

function like(state, id_post){
  if (state.x_api_key == "") alert("Vous devez être authentifié pour liker");
  else {
    const url = `${server}topic/${state.idTopic}/post/${id_post}/like`;
    let response_ok = false;

    let headers = new Headers();
    headers.set(x_api_key_header, state.x_api_key);
    headers.set(content_type_header, content_type_value);

    return fetch(url, {method: "PUT", headers:headers})
      .then(response => {
        response_ok= response.ok;
        return response.json();
      })
      .then(post => {    // verif
        if (response_ok) {
          const indTopic = indexId(state.topics, state.idTopic);
          const indPost = indexId(state.topics[indTopic].posts, id_post);
          state.topics[indTopic].posts[indPost] = post;
          return state;
        } else {
          throw(new Error(`Erreur dans la requête ${url}: ${JSON.stringify(post)}`));
        }
      }); 
  }
}

function dislike(state, id_post){
  if (state.x_api_key == "") alert("Vous devez être authentifié pour disliker");
  else {
    const url = `${server}topic/${state.idTopic}/post/${id_post}/dislike`;
    let response_ok = false;

    let headers = new Headers();
    headers.set(x_api_key_header, state.x_api_key);
    headers.set(content_type_header, content_type_value);


    return fetch(url, {method: "PUT", headers:headers})
      .then(response => {
        response_ok= response.ok;
        return response.json();
      })
      .then(post => {    // verif
        if (response_ok) {
          const indTopic = indexId(state.topics, state.idTopic);
          const indPost = indexId(state.topics[indTopic].posts, id_post);
          state.topics[indTopic].posts[indPost] = post;
          return state;
        } else {
          throw(new Error(`Erreur dans la requête ${url}: ${JSON.stringify(post)}`));
        }
      });  
  }
}

function ajoutSujet(state) {
  const title = document.getElementById("upload-title").value;
  const description = document.getElementById("upload-description").value;
  const open = document.getElementById("upload-open").value;
  const body = JSON.stringify({"topic":title, "desc":description, "open":true});
  const url = server + "topic/create";
  let headers = new Headers();
  headers.set(content_type_header, content_type_value);
  headers.set(x_api_key_header, state.x_api_key);
  let response_ok = false;

  return fetch(url, {method: "POST", headers:headers, body:body})
    .then(response => {    // verif
        response_ok = response.ok;
        return response.json();
    })
    .then(topic => {    // verif
      if (response_ok) {
        state.topics.push(topic);
        return state;
      } else {
        throw(new Error(`Erreur dans la requête ${url}: ${JSON.stringify(topic)}`));
      }
    });
}

function ajoutPost(state) {
  const body = JSON.stringify({"content":document.getElementById("contrib-text").value});
  const url = server + `topic/${state.idTopic}/post/create`;
  let headers = new Headers();
  headers.set(content_type_header, content_type_value);
  headers.set(x_api_key_header, state.x_api_key);
  let response_ok = false;

  return fetch(url, {method: "POST", headers:headers, body:body})
    .then(response => {    // verif
        response_ok = response.ok;
        return response.json();
    })
    .then(post => {    // verif
      if (response_ok) {
        state.topics[indexId(state.topics, state.idTopic)].posts.push(post);
        return state;
      } else {
        throw(new Error(`Erreur dans la requête ${url}: ${JSON.stringify(topic)}`));
      }
    });
}

function supprimerPost(state, id_post) {
  const url = `${server}topic/${state.idTopic}/post/${id_post}/delete`;
    let response_ok = false;

    let headers = new Headers();
    headers.set(x_api_key_header, state.x_api_key);
    headers.set(content_type_header, content_type_value);


    return fetch(url, {method: "DELETE", headers:headers})
      .then(response => {
        response_ok= response.ok;
        return response.json();
      })
      .then(data => {    // verif
        if (response_ok) {
          const indTopic = indexId(state.topics, state.idTopic);
          const indPost = indexId(state.topics[indTopic].posts, id_post);
          state.topics[indTopic].posts.splice(indPost,1);
          return state;
        } else {
          throw(new Error(`Erreur dans la requête ${url}: ${JSON.stringify(data)}`));
        }
      });  
}

function cleanTopics() {
  const url = server + "topic/delete-all";
  let headers = new Headers();
  headers.set(content_type_header, content_type_value);
  headers.set(x_api_key_header, my_api_key);
  let response_ok = false;

  return fetch(url, {method: "DELETE", headers:headers})
    .then(response => {    // verif
        response_ok = response.ok;
        return response.json();
    })
    .then(data => {    // verif
      if (response_ok) {
        return data;
      } else {
        throw(new Error(`Erreur dans la requête ${url}: ${JSON.stringify(data)}`));
      }
    });
}

const echo = (_state) => (data) => {
  const url = server + "echo";
  const body = JSON.stringify(data);
  let headers = new Headers();
  headers.set(content_type_header, content_type_value);

  return fetch(url, { method: "POST", headers: headers, body: body })
  .then(function(response) {
    if (response.ok)
      return response.json();
  })
  //ce catch ca attraper à la fois les promesses rejetées ET les exceptions
  //on aurait pu écrire reason => console.error(reason), ce qui revient au même
  .catch(console.error); 
};

/************************************************************** */
/** MAIN PROGRAM */
/************************************************************** */
document.addEventListener("DOMContentLoaded", function(){
  if (!document.getElementById("title-test-projet")) {
    cleanTopics()
    .then(get_topics_all)
    .then(topics => new State([], topics))
    .then(setListeTopics)           
    .then(attach_all_handlers)
    .then(state => console.log(state))
    .catch(reason => console.error(reason));
  }
}, false);