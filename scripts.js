const jsmediatags = window.jsmediatags;

let now_playing = document.querySelector(".now-playing");
let track_art = document.querySelector(".track-art");
let track_name = document.querySelector(".track-name");
let track_artist = document.querySelector(".track-artist");
 
let playpause_btn = document.querySelector(".playpause-track");
let next_btn = document.querySelector(".next-track");
let prev_btn = document.querySelector(".prev-track");
 
let seek_slider = document.querySelector(".seek_slider");
let seek;
let volume_slider = document.querySelector(".volume_slider");
let volume;
let curr_time = document.querySelector(".current-time");
let curr;
let total_duration = document.querySelector(".total-duration");
let total;

const remove_btn = document.getElementById('remove-track-button');
let files = [];
let filePaths = [];
let firstTime;

let storage = [];
let track_list = [];
let track_index = 0;
let isPlaying = false;
let updateTimer;
let url = "";
let music_list = document.querySelector("#songlist");
let isRepeating = false;
let block = false;
let repeatIcon = document.querySelector(".repeat-track");
 
let curr_track = document.createElement('audio');

document.addEventListener("DOMContentLoaded", async() => 
  {
    const loadState = await window.electronAPI.loadState();
    filePaths = loadState.filePaths || [];
    track_index = loadState.track_index || 0;
    isPlaying = loadState.isPlaying || false;
    isRepeating = loadState.isRepeating || false;
    volume = loadState.volume;
    //seek = loadState.seek;
    //duration = Math.floor(loadState.duration);

    console.log('isRepeat: ',isRepeating);

    await loadUpFiles();
    await updateTrackList(files);
    updateDisplayList();
    loadTrack(track_index);
    pauseTrack();
    if (isRepeating){repeatTrack();}
      

    volume_slider.value=volume;
    volume_slider.textContent=volume;
    setVolume();

    files = [];
});

function updateState()
{
  const state = 
  {
    filePaths,
    track_index,
    isPlaying,
    isRepeating,
    volume,
    //seek,
    //duration,
  };
  window.electronAPI.backupState(state);
}

document.getElementById('open-file-button').addEventListener('click', async () => {
    filePaths = await window.electronAPI.openFileDialog();
    //console.log('File Paths: ',filePaths);
    
    await loadUpFiles();

    await updateTrackList(files);
    updateDisplayList();
    loadTrack(track_index);
    pauseTrack();
    updateState();

    files = [];
});

async function loadUpFiles()
{
  try
  {
    for (const filePath of filePaths) {
      //console.log("File path:", filePath);

      // Get the base64 string from the main process
      const base64Data = await window.electronAPI.filePathToBase64(filePath);
      
      // Convert base64 to Blob
      const fileBlob = new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
      const fileName = filePath.split('\\').pop(); // Extract file name from the path
      const file = new File([fileBlob], fileName, { type: 'audio/mpeg' });
      
      //console.log("File object:", file);

      files.push(file);
      //console.log('LOAD UP COMPLETE!');
    }
  }
  catch (error) {console.error('Error with loadUpFiles: ', error);}
}

/*document.querySelector("#input").addEventListener("change", async (event) => {
  await updateTrackList(event);
  updateDisplayList();
  loadTrack(track_index);
  pauseTrack();
  updateState();
});*/

document.querySelector("#songlist").addEventListener("click", function(e) {
  track_index = parseInt(e.target.dataset.url);
  loadTrack(track_index);
  playTrack();
  updateState();
});

remove_btn.addEventListener('click', function() 
{
  removeTrack();
});

async function updateTrackList(files) 
{ 
  for (const file of files) 
    {
    //console.log('TRACKLISTFILE',file)
    await new Promise((resolve) => {
      jsmediatags.read(file, {
        onSuccess: (tag) => {
          addTrack(getTitle(tag, file.name), getArtist(tag), getPicture(tag));
          //console.log('FILE IN STORAGE: ',file);
          storage.push(file);
          //console.log('STORAGE IS COMPLETE!');
          resolve();
        },
        onError: (error) => {
          console.error(error);
          resolve();
        },
      });
    });
  }
}

function updateDisplayList() {
  if (!block)
  {
    music_list.style.display = "block";
    block = true;
  }
  music_list.innerHTML = "";
  for(let i = 0; i < track_list.length; i++) {
    let li = document.createElement("li");
    let spa = document.createElement("span")
    spa.appendChild(document.createTextNode(track_list[i].name));
    li.setAttribute("data-url", i);
    spa.setAttribute("data-url", i);
    li.appendChild(spa);
    music_list.appendChild(li);
  }
}

function getTitle(tag, name) {
  if (tag.tags.title) {
    return tag.tags.title;
  } else {
    let split = name.split('.');
    split.pop();
    return split;
  }
}

function getArtist(tag) {
  if (tag.tags.artist) {
    return tag.tags.artist;
  } else {
    return "Ismeretlen előadó";
  }
}

function getPicture(tag) {
  if (tag.tags.picture) {
    const data = tag.tags.picture.data;
    const format = tag.tags.picture.format;
    let base64String = "";
    for(let i = 0; i < data.length; i++)
    {
      base64String += String.fromCharCode(data[i]);
    }
    return `url(data:${format};base64,${window.btoa(base64String)})`;
  } else {
    /*return `url("vinyl.gif")`;*/
    return `url("screenshot_20221030_010306.png")`;
  }
}

function addTrack(name, artist, image) {
  track_list.push({
    name: name,
    artist: artist,
    image: image
  });
}

function removeTrack()
{
  console.log(track_index);
  storage.slice(track_index);
  track_list.slice(track_index);
  filePaths.slice(track_index);
  updateDisplayList();
  loadTrack(track_index);
  playTrack();
}

function loadTrack(track_index) {
    clearInterval(updateTimer);

    resetValues();
   
    if (url) URL.revokeObjectURL(url);
    
    url = URL.createObjectURL(storage[track_index]);
    curr_track.src = url;
    curr_track.load();
   
    track_art.style.backgroundImage = track_list[track_index].image;
    track_name.textContent = track_list[track_index].name;
    track_artist.textContent = track_list[track_index].artist;
    now_playing.textContent = "Éppen lejátszva: " + (track_index + 1) + ". a " + track_list.length + "-ből";
   
    updateTimer = setInterval(seekUpdate, 1000);

    curr_track.addEventListener("ended", nextTrack);
   
    random_bg_color();
}
   
function random_bg_color() {
    let red = Math.floor(Math.random() * 256) + 64;
    let green = Math.floor(Math.random() * 256) + 64;
    let blue = Math.floor(Math.random() * 256) + 64;
   
    let bgColor = "rgb(" + red + ", " + green + ", " + blue + ")";
   
    document.body.style.background = bgColor;

    /*if (!firstTime)
      {
        console.log('POGGERS');
        firstTime = 1;
        seek_slider.value=seek;
        seek_slider.textContent=seek;
        seekTo();
        seekUpdate();
      }*/
}

function resetValues() {

    curr_time.textContent = "00:00";
    total_duration.textContent = "00:00";
    seek_slider.value = 0;

}

function playpauseTrack() {
    if (!isPlaying) playTrack();
    else pauseTrack();
}
    
function playTrack() {
curr_track.play();
isPlaying = true;
playpause_btn.innerHTML = '<i class="fa fa-pause-circle fa-5x"></i>';

updateState();
}

function pauseTrack() {
curr_track.pause();
isPlaying = false;
playpause_btn.innerHTML = '<i class="fa fa-play-circle fa-5x"></i>';

updateState();
}

function nextTrack() {
if (!isRepeating) {
  if (track_index < track_list.length - 1)
    track_index += 1;
  else track_index = 0;

  loadTrack(track_index);
  playTrack();
} else {
  curr_track.currentTime = 0;
  playTrack();
}
}

function prevTrack() {
if (!isRepeating) {
  if (track_index > 0)
    track_index -= 1;
  else track_index = track_list.length - 1;

  loadTrack(track_index);
  playTrack();
} else {
  curr_track.currentTime = 0;
  playTrack();
}
}

function repeatTrack() {
  if (!isRepeating) {
    isRepeating = true;
    repeatIcon.innerHTML = '<img style="padding: 25px; width: 28px; height: 32px;" src="./Repeat.png" alt="Ismétlés">'
  } else {
    isRepeating = false;
    repeatIcon.innerHTML = '<img style="padding: 25px; width: 28px; height: 32px;" src="./NoRepeat.png" alt="Ismétlés">'
  }
  updateState();
}

function seekTo() {
    let seekto = curr_track.duration * (seek_slider.value / 100);
    //console.log('DURATION: ',curr_track.duration,' SEEK SLIDER VALUE: ',seek_slider.value);
    curr_track.currentTime = seekto;

    /*seek=seek_slider.value;
    duration=curr_track.duration;
    updateState();*/
}
   
function setVolume() {
    curr_track.volume = volume_slider.value / 100;
    
    volume = volume_slider.value;
    updateState();
}
   
function seekUpdate() {
    let seekPosition = 0;
   
    if (!isNaN(curr_track.duration)) {
      seekPosition = curr_track.currentTime * (100 / curr_track.duration);
      seek_slider.value = seekPosition;
   
      let currentMinutes = Math.floor(curr_track.currentTime / 60);
      let currentSeconds = Math.floor(curr_track.currentTime - currentMinutes * 60);
      let durationMinutes = Math.floor(curr_track.duration / 60);
      let durationSeconds = Math.floor(curr_track.duration - durationMinutes * 60);
   
      if (currentSeconds < 10) { currentSeconds = "0" + currentSeconds; }
      if (durationSeconds < 10) { durationSeconds = "0" + durationSeconds; }
      if (currentMinutes < 10) { currentMinutes = "0" + currentMinutes; }
      if (durationMinutes < 10) { durationMinutes = "0" + durationMinutes; }
   
      curr_time.textContent = currentMinutes + ":" + currentSeconds;
      total_duration.textContent = durationMinutes + ":" + durationSeconds;

      //seek=seek_slider.value;
      //duration=curr_track.duration;
    }
}